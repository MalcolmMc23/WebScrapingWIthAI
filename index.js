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

        const selector = "body"

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