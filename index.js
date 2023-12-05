//https://brightdata.com/cp/datasets?format=month&dimension=product&from=2023-09-01&to=2023-11-30


import puppeteer from 'puppeteer-core'
import { config } from 'dotenv'
config()
import readline from "readline";
import OpenAI from "openai";
import fs from 'fs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

let userName = process.env.USER_NAME
let password = process.env.PASSWORD

let gotHTML = false;

const userInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})


// copy past text 
// please scrape: https://www.litcharts.com/lit/salvage-the-bones/the-eighth-day-make-them-know with the selecor: .summary-text
userInterface.prompt() // creates a user input prompt 
userInterface.on('line', async input => {
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [{
            "role": "user",
            "content": input
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
                        "selector": {
                            "type": "string",
                            "description": "the selector that will be extracted from the website"
                        }
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
            console.log("arguemnt 1: " + argumentObj.website)
            console.log("arguemnt 2: " + argumentObj.selector)
            await scrape(argumentObj.website, argumentObj.selector)
                .then(results => {
                    console.log("Got the HTML! What would you like to with it?")
                    userInterface.prompt() // creates a user input prompt 
                    userInterface.on('line', async input => {
                        let text = results
                        // fs.readFile('text.txt', 'utf8', (err, data) => {
                        //     if (err) {
                        //         console.error(err);
                        //         return;
                        //     }
                        //     text = data
                        // });
                        const response2 = await openai.chat.completions.create({
                            model: "gpt-3.5-turbo-1106",
                            messages: [{
                                "role": "user",
                                "content": `using the following HTML ${input}.      ${text}`
                            }]
                        })
                        console.log(response2.choices[0].message)
                        userInterface.close()
                    })
                })
                .catch(error => console.log(error))
        }
    }
})








async function scrape(website, selector) {
    let browser;
    let url = website

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
        // await page.goto(`https://www.amazon.com/gcx/Holiday-Deals/gfhz/events?categoryId=HOL-Deals&isLimitedTimeOffer=true&ref_=nav_cs_holdeals_1&scrollState=eyJpdGVtSW5kZXgiOjAsInNjcm9sbE9mZnNldCI6NjU1LjUzMTI1fQ%3D%3D&sectionManagerState=eyJzZWN0aW9uVHlwZUVuZEluZGV4Ijp7ImFtYWJvdCI6MH19`)
        await page.goto(url)

        // const selector = "body"

        await page.waitForSelector(selector)
        const el = await page.$(selector)

        const text = await el.evaluate(e => e.innerHTML)

        // console.log(text)

        fs.writeFile("text.txt", '', (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('File has been cleared!');
        });
        fs.writeFile("text.txt", text, 'utf8', (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('File has been written');
        });

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
        // const products = await page.evaluate(() => {
        //     // Initialize an empty array to store the product details
        //     const items = [];
        //     // Select all product elements on the page
        //     const productElements = document.querySelectorAll('figure[data-test="product"]');

        //     // Loop through each product element
        //     productElements.forEach((productElement) => {
        //         // Extract the product name
        //         const name = productElement.querySelector('span.hoLOMk.iJcgAl')?.innerText;
        //         // Extract the product price
        //         const price = productElement.querySelector('div.sc-1c51cxx-5.fOZRzS span.XmvAr')?.innerText;
        //         // Extract the original price of the product
        //         const originalPrice = productElement.querySelector('div.sc-1c51cxx-5.fOZRzS span.iTTucF')?.innerText;
        //         // Select the discount element
        //         const discountElement = productElement.querySelector('div.sc-1ikvg6x-2.fNKBCr');
        //         // Initialize discount as null
        //         let discount = null;

        //         // If a discount element exists
        //         if (discountElement) {
        //             // Extract the discount text
        //             const discountText = discountElement.textContent;
        //             // Use regex to extract the discount percentage from the text
        //             const match = discountText.match(/(\d+)% off/);
        //             // If a match is found, set the discount
        //             if (match) {
        //                 discount = match[1] + '% off';
        //             }
        //         }

        //         // If name, price, and discount exist, add the product details to the items array
        //         if (name && price && discount) {
        //             items.push({ name, price, originalPrice, discount });
        //         }
        //     });

        //     // Return the array of product details
        //     return items;
        // });

        // Log the array of product details
        // console.log(products)

        return text;
    } catch (error) {
        console.error("scrape failed", error);
    }
    finally {
        // closes the browser
        await browser?.close();
    }
}





// scrape()