import puppeteer from 'puppeteer-core'
import { config } from 'dotenv'
config()
let userName = process.env.USER_NAME
let password = process.env.PASSWORD

async function run() {
    let browser;

    try {
        const auth = `${userName}:${password}`
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://${auth}@brd.superproxy.io:9222`
        })

        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(2 * 60 * 1000)

        await page.goto(`https://www.amazon.com/gcx/Holiday-Deals/gfhz/events?categoryId=HOL-Deals&isLimitedTimeOffer=true&ref_=nav_cs_holdeals_1&scrollState=eyJpdGVtSW5kZXgiOjAsInNjcm9sbE9mZnNldCI6NjU1LjUzMTI1fQ%3D%3D&sectionManagerState=eyJzZWN0aW9uVHlwZUVuZEluZGV4Ijp7ImFtYWJvdCI6MH19`)

        // const selector = ".a-carousel"

        // // class=".sc-1koy58b-0 jChBdP"
        // // sc-15wd500-0 hjMJzD

        // // class="a-carousel"
        // await page.waitForSelector(selector)
        // const el = await page.$(selector)

        // const text = await el.evaluate(e => e.innerHTML)

        // console.log(text)


        // const products = await page.evaluate(() => {
        //     const items = [];
        //     const productElements = document.querySelectorAll('.dcl-product-wrapper');
        //     productElements.forEach((productElement) => {
        //         const name = productElement.querySelector('.a-truncate-full')?.textContent.trim();
        //         const price = productElement.querySelector('.dcl-product-price-new .a-offscreen')?.innerText;
        //         const discount = productElement.querySelector('.dcl-badge-label .dcl-badge-text')?.textContent.trim();

        //         if (name && price && discount) {
        //             items.push({ name, price, discount });
        //         }
        //     });
        //     return items;
        // });

        const products = await page.evaluate(() => {
            const items = [];
            const productElements = document.querySelectorAll('figure[data-test="product"]'); // selector for each product

            productElements.forEach((productElement) => {
                const name = productElement.querySelector('span.hoLOMk.iJcgAl')?.innerText; // selector for the product name
                const price = productElement.querySelector('div.sc-1c51cxx-5.fOZRzS span.XmvAr')?.innerText; // selector for the price
                const originalPrice = productElement.querySelector('div.sc-1c51cxx-5.fOZRzS span.iTTucF')?.innerText; // selector for the original price
                const discountElement = productElement.querySelector('div.sc-1ikvg6x-2.fNKBCr'); // selector for the discount
                let discount = null;

                if (discountElement) {
                    const discountText = discountElement.textContent;
                    const match = discountText.match(/(\d+)% off/); // regex to extract the discount percentage
                    if (match) {
                        discount = match[1] + '% off'; // gets the percentage
                    }
                }

                if (name && price && discount) {
                    items.push({ name, price, originalPrice, discount });
                }
            });

            return items;
        });

        //to be forbidden
        console.log(products)


        // const products = await page.evaluate(() => {
        //     const items = [];
        //     const productElements = document.querySelectorAll('.a-carousel-card');
        //     productElements.forEach((productElement) => {
        //         const name = productElement.querySelector('.p13n-sc-truncate-desktop-type2.p13n-sc-truncated')?.innerText;
        //         const price = productElement.querySelector('._cDEzb_p13n-sc-price_3mJ9Z')?.innerText;
        //         const url = productElement.querySelector('a.a-link-normal[href*="/dp/"]').href
        //         if (name && price && url) {
        //             items.push({ name, price, url });
        //         }
        //     });
        //     return items;
        // });

        // //* this way of sorting was written by chatgpt
        // // Define a function to parse the price from a string to a float
        // const parsePrice = (priceStr) => {
        //     return parseFloat(priceStr.replace(/[$,]/g, ''));
        // };
        // // Log the products sorted by price
        // console.log(products.sort((a, b) => parsePrice(a.price) - parsePrice(b.price)));
        // //* 

        return;
    } catch (error) {
        console.error("scrape failed", error);
    }
    finally {
        await browser?.close();
    }
}

run()