const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

//const OpenAI = require("openai");
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());

app.get("/recipeStream", (req, res) => {
    const ingredients = req.query.ingredients;
    const mealType = req.query.mealType;
    const cuisine = req.query.cuisine;
    const time = req.query.time;
    const complexity = req.query.complexity;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (part) => {
        let response;
        if (part.choices[0].finish_reason === "stop") {
            res.write(`data: ${JSON.stringify({ action: "close" })}\n\n`);
        } else {
            if (
                part.choices[0].delta.role &&
                part.choices[0].delta.role === "assistant"
            ) {
                response = {
                    action: "start"
                };
            } else {
                response = {
                    action: "part",
                    part: part.choices[0].delta.content,
                }
            }
            res.write(`data: ${JSON.stringify(response)}\n\n`);

        }

    };

    const prompt = [];
    prompt.push("Generate a recipe that incorporates the following details:");
    prompt.push(`[Ingredients: ${ingredients}]`);
    prompt.push(`[Meal Type: ${mealType}]`);
    prompt.push(`[Cuisine Preference: ${cuisine}]`);
    prompt.push(`[Cooking Time: ${time}]`);
    prompt.push(`[Complexity: ${complexity}]`);
    prompt.push("Please provide a detailed recipe, including steps for preparation and cooking");
    prompt.push("Only use the ingredients mentioned");
    prompt.push("The recipe should highlight the fresh and vibrant flavors of the ingredients");
    prompt.push("Also give the recipe a suitable name in its local language based on cuisine preference");

    const messages = [
        {
            role: "system",
            content: prompt.join(" "),
        }
    ];

    fetchOpenAICompletionStream(messages, sendEvent);

    req.on("close", () => {
        res.end();
    });

});

async function fetchOpenAICompletionStream(messages, callback) {
    const apikey = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({ apiKey: apikey });
    const aiModel = "gpt-3.5-turbo";

    try {
        const completion = await openai.chat.completions.create({
            model: aiModel,
            messages: messages,
            stream: true,
        })
        console.log(completion);

        for await (const part of completion) {
            callback(part);
        }

    } catch (err) {
        console.error("Error fetching OpenAI completion: ", err);
    }
}

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});


