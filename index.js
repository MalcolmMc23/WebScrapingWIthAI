import puppeteer from 'puppeteer-core'
import { config } from 'dotenv'
config()
import readline from "readline";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });


let userName = process.env.USER_NAME
let password = process.env.PASSWORD


async function runConversation() {

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [{
            "role": "user",
            "content": "please scrape this website: https://sequoia.instructure.com/courses/51730/discussion_topics/180205?module_item_id=935933"
        }],

        tools: [{
            "type": "function",
            "function": {
                "name": "scrape", // Name of the function
                "description": "opens a headless webrowser and scrapes the html of a website for data", // Description of the function
                "parameters": { // Parameters of the function
                    "type": "object",
                    "properties": {
                        "website": { // Parameter 1: website
                            "type": "string",
                            "description": "The website to scrape",
                        },
                    },
                    "required": ["website"] // Required parameters
                },
            }

        }],
        tool_choice: "auto",  // Specify the tool choice strategy
    })


    let wantsToCallFunction = response.choices[0].finish_reason == "tool_calls"
    if (wantsToCallFunction) {
        if (response.choices[0].message.tool_calls[0].function.name == "scrape") {
            let argumentObj = JSON.parse(response.choices[0].message.tool_calls[0].function.arguments);
            console.log("arguemnt: " + argumentObj.website)
            await scrape()
                .then(results => console.log(results))
                .catch(error => console.log(error))

        }
    }

}
runConversation()





async function scrape() {
    let browser;

    try {
        // Create a string 'auth' that concatenates 'userName' and 'password' with a colon in between
        const auth = `${userName}:${password}`
        // Connect to the browser using puppeteer and the WebSocket endpoint, passing in 'auth' for authentication
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://${auth}@brd.superproxy.io:9222`
        })

        // Create a new page in the browser
        const page = await browser.newPage()
        // Set the default navigation timeout for the page to 2 minutes
        page.setDefaultNavigationTimeout(2 * 60 * 1000)

        // Navigate to the Amazon Holiday Deals page
        await page.goto(`https://www.amazon.com/gcx/Holiday-Deals/gfhz/events?categoryId=HOL-Deals&isLimitedTimeOffer=true&ref_=nav_cs_holdeals_1&scrollState=eyJpdGVtSW5kZXgiOjAsInNjcm9sbE9mZnNldCI6NjU1LjUzMTI1fQ%3D%3D&sectionManagerState=eyJzZWN0aW9uVHlwZUVuZEluZGV4Ijp7ImFtYWJvdCI6MH19`)

        // const selector = ".a-carousel"
        // await page.waitForSelector(selector)
        // const el = await page.$(selector)

        // const text = await el.evaluate(e => e.innerHTML)

        // console.log(text)

        //* uncomment this after xmass
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

        // Extract product details from the page
        const products = await page.evaluate(() => {
            // Initialize an empty array to store the product details
            const items = [];
            // Select all product elements on the page
            const productElements = document.querySelectorAll('figure[data-test="product"]');

            // Loop through each product element
            productElements.forEach((productElement) => {
                // Extract the product name
                const name = productElement.querySelector('span.hoLOMk.iJcgAl')?.innerText;
                // Extract the product price
                const price = productElement.querySelector('div.sc-1c51cxx-5.fOZRzS span.XmvAr')?.innerText;
                // Extract the original price of the product
                const originalPrice = productElement.querySelector('div.sc-1c51cxx-5.fOZRzS span.iTTucF')?.innerText;
                // Select the discount element
                const discountElement = productElement.querySelector('div.sc-1ikvg6x-2.fNKBCr');
                // Initialize discount as null
                let discount = null;

                // If a discount element exists
                if (discountElement) {
                    // Extract the discount text
                    const discountText = discountElement.textContent;
                    // Use regex to extract the discount percentage from the text
                    const match = discountText.match(/(\d+)% off/);
                    // If a match is found, set the discount
                    if (match) {
                        discount = match[1] + '% off';
                    }
                }

                // If name, price, and discount exist, add the product details to the items array
                if (name && price && discount) {
                    items.push({ name, price, originalPrice, discount });
                }
            });

            // Return the array of product details
            return items;
        });

        // Log the array of product details
        console.log(products)

        return;
    } catch (error) {
        console.error("scrape failed", error);
    }
    finally {
        // closes the browser
        await browser?.close();
    }
}

// scrape()