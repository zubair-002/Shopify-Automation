import scrapy
import json
from scrapy.crawler import CrawlerProcess
from bs4 import BeautifulSoup
import pandas as pd
import argparse
import pyodbc

class MultiSiteSpider(scrapy.Spider):
    name = "products"
    custom_settings = {
        'DOWNLOAD_DELAY': 1,  # 2 seconds delay between requests
        'CONCURRENT_REQUESTS_PER_DOMAIN': 10,  # Only one request at a time per domain
    }
    headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9,ur;q=0.8',
    'if-none-match': '"cacheable:27a6c07e9b7fb42eae6a8b8466a97e0e"',
    'priority': 'u=0, i',
    'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
}
    def __init__(self, urls=[], user_id=None, scrape_session_id=None, **kwargs):
        super().__init__(**kwargs)
        self.start_urls = urls
        self.site_data = []
        self.user_id = user_id
        self.scrape_session_id = scrape_session_id
        self.conn = pyodbc.connect(
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=localhost\\SQLEXPRESS;"
            "DATABASE=master;"
            "Trusted_Connection=Yes;"
            "MARS_Connection=Yes;"
        )
        self.cursor = self.conn.cursor()
       
    def start_requests(self):

        for site in self.start_urls:
            site_url = f"https://{site.split('www.')[-1]}"+"/sitemap.xml"
            # self.site_data[site] = []
            yield scrapy.Request(url=site_url, callback=self.parse_site, meta={"site": site},headers=self.headers)
    def parse_site(self, response):
        site = response.meta["site"]
        sitemaps = response.xpath('//ns:sitemap/ns:loc/text()', namespaces={'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}).getall()
        for sitemap_url in sitemaps:
            yield scrapy.Request(sitemap_url, callback=self.parse_sitemap,meta=response.meta,headers=self.headers)

    def parse_sitemap(self, response):
        # Extract product links containing '/products/' from sub-sitemaps
        product_links = response.xpath('//ns:url/ns:loc[contains(text(), "/products/")]/text()', 
                                       namespaces={'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}).getall()
        for link in product_links[20:40]:
            
            yield scrapy.Request(
                url=link+'.json',
                callback=self.parse_product,
                meta={"site": response.meta['site']},headers=self.headers
            )
    def parse_product(self, response):
        site = response.meta["site"]
        # count = response.meta["count"]

        try:
            product = json.loads(response.text)["product"]
        except (json.JSONDecodeError, KeyError):
            self.logger.error(f"Failed to parse product JSON from {response.url}")
            return

        title = product.get("title", "N/A").replace(',','')
        published_at = product.get("published_at", "N/A").replace(',','')
        created_at = product.get("created_at", "N/A").replace(',','')

        # Clean product description
        soup = BeautifulSoup(product.get("body_html", ""), "html.parser")
        for tag in soup.find_all(["div", "img", "h1", "strong"]):
            tag.decompose()
        description = soup.get_text(separator="\n").strip().replace(',','')
        description = "\n".join([line.strip() for line in description.split("\n") if line.strip()])
        if not description:
            description = ''
        for variant in product.get("variants", []):
            url = response.urljoin(f"/products/{product.get('handle')}")
            variant_title = variant.get("title", "N/A").replace(',','')
            price = variant.get("price", "N/A").replace(',','')
            image = ''
            try:
                image = variant["featured_image"]["src"]
            except KeyError:
                image_id = variant.get("image_id")
                if image_id:
                    for img in product.get("images", []):
                        if img["id"] == image_id:
                            image = img["src"]
                            break
            

            item = {
                "product id": str(variant.get("id", "N/A")).replace(',', ''),
                "url": url,
                "title": title,
                "variant": variant_title,
                "price": price,
                "original price": variant.get("compare_at_price", "N/A").replace(',',''),
                "product variant option": variant.get("option1", "N/A").replace(',',''),
                "published_at": published_at,
                "created_at": created_at,
                "updated_at": variant.get("updated_at", "N/A"),
                "image": image.replace(',',''),
                "description": description,
            }
            self.logger.info(f"Scraped item for {site}: {item}")
            self.site_data.append(item)

            # Insert into database
            try:
                # # Make sure self.conn and self.cursor are initialized in __init__ or globally
                # # Check if product already exists for this user and product_id
                # self.cursor.execute(
                #     "SELECT COUNT(*) FROM products WHERE user_id = ? AND product_id = ?",
                #     (self.user_id, item["product id"])
                # )
                # exists = self.cursor.fetchone()[0]

                # if exists:
                #     # Update the existing product
                #     self.cursor.execute(
                #         """
                #         UPDATE products SET
                #             url = ?,
                #             title = ?,
                #             variant = ?,
                #             price = ?,
                #             original_price = ?,
                #             product_variant_option = ?,
                #             image = ?,
                #             description = ?,
                #             published_at = ?,
                #             created_at = ?,
                #             updated_at = ?
                #         WHERE user_id = ? AND product_id = ?
                #         """,
                #         (
                #             item["url"],
                #             item["title"],
                #             item["variant"],
                #             item["price"],
                #             item["original price"],
                #             item["product variant option"],
                #             item["image"],
                #             item["description"],
                #             item["published_at"],
                #             item["created_at"],
                #             item["updated_at"],
                #             self.user_id,
                #             item["product id"]
                #         )
                #     )
                # else:
                #     # Insert new product
                    self.cursor.execute(
                        """
                        INSERT INTO products (
                            user_id, product_id, url, title, variant, price, original_price,
                            product_variant_option, image, description, published_at, created_at, updated_at, scrape_session_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            self.user_id,
                            item["product id"],
                            item["url"],
                            item["title"],
                            item["variant"],
                            item["price"],
                            item["original price"],
                            item["product variant option"],
                            item["image"],
                            item["description"],
                            item["published_at"],
                            item["created_at"],
                            item["updated_at"],
                            self.scrape_session_id
                        )
                    )
                    self.conn.commit()
            except Exception as e:
                self.logger.error(f"Failed to insert product into DB: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--urls', type=str, required=True)
    parser.add_argument('--user_id', type=str, required=True)
    parser.add_argument('--scrape_session_id', type=str, required=True)
    args = parser.parse_args()

    urls = args.urls.split(',')
    user_id = args.user_id
    scrape_session_id = args.scrape_session_id

    process = CrawlerProcess()
    process.crawl(MultiSiteSpider, urls=urls, user_id=user_id, scrape_session_id=scrape_session_id)
    process.start()