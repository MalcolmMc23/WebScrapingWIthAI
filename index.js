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
let html = ''


const userInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})


// copy past text 
// please scrape: https://www.litcharts.com/lit/salvage-the-bones/the-eighth-day-make-them-know with the selecor: .summary-text
async function handleChat(input) {
    let prompt
    let response
    if (html == '') {
        prompt = input
        response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-1106",
            messages: [{
                "role": "user",
                "content": prompt,
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
                    },
                }

            }],
            tool_choice: "auto",  // Specify the tool choice strategy
        });

    } else {
        prompt = `please use the following HTML. ${input}. ${html}`
        response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: [{
                "role": "user",
                "content": prompt,
            }]
        })
    }


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
                })
                .catch(error => console.log(error))
        } else {
            console.log("made it with no function call!")
            console.log(response.choices[0].message.content);
            // Prompting for new input
            userInterface.prompt();
        }
    }

}

// Initial prompt
userInterface.prompt();
userInterface.on('line', input => {
    handleChat(input);
});







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

        html = await el.evaluate(e => e.innerHTML)

        // console.log(text)

        fs.writeFile("text.txt", '', (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('File has been cleared!');
        });
        fs.writeFile("text.txt", html, 'utf8', (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('File has been written');
        });


        return html;
    } catch (error) {
        console.error("scrape failed", error);
    }
    finally {
        // closes the browser
        await browser?.close();
    }
}





// scrape()
