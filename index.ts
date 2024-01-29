import { getRandom } from "random-useragent";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth"

import { format } from "util";
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "fs";

import "./Date.extension"
import { ElementHandle, Frame, Page } from "puppeteer";
import assert from "assert";
import { EOL } from "os";

/**
 * Returns a promise that resolves after `time` milliseconds
 * @param time time in milliseconds
 * @returns 
 */
async function wait(time: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    })
}

function randomOctet(): string {
    return (Math.floor(Math.random() * 255) + 1).toString();
}

async function getEmbeddedUntis(ctx: Page): Promise<Frame> {
    const frames = ctx.frames();
    const embeddedUntisFrame = frames.at(frames.findIndex((frame, i, a) => frame.name() === "embedded-webuntis" ? 1 : 0))
    assert(embeddedUntisFrame !== undefined, "embedded untis acquisitoion failed!");
    return embeddedUntisFrame;
}

/**
 * HTML selectors. Do not touch!
 */
const LOGIN_WITH_OFFICE = "#app > div > div > div.content-container > div.widget-section > div > div.panel-body > div > div.login-content > div > button";

const MS_EMAIL_INPUT = "#i0116";
const MS_PASSWORD_INPUT = "#i0118";
const MS_CREDENTIAL_CONFIRM = "#idSIButton9";

const VALID_LESSONS_IN_TIMETABLE = "div.renderedEntry";

const SCRAPE_INFOCOLUMNS = "div.pipe-separator";
const SCRAPE_ACTIVITY = "textarea.ant-input-disabled";

const CSV_OUTPUT_FILEPATH = "./untis_export.csv";

const config: { msOauth2: { user: string, pass: string }, untisLoginUrl: string, firstWeekUrl: string } = JSON.parse(readFileSync("./config.json", "utf-8"));

console.log("Using config:", config);

(async () => {
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({ headless: false, args: ["--start-maximized"], });
    const page = await browser.newPage();
    // const randomIPForSpoof = format("%s.%s.%s.%s", randomOctet(), randomOctet(), randomOctet(), randomOctet());

    page.setExtraHTTPHeaders({
        // "X-Forwarded-For": randomIPForSpoof,
        // "X-Forwarded-Host": randomIPForSpoof,
        // "X-Client-IP": randomIPForSpoof,
        // "X-Remote-IP": randomIPForSpoof,
        // "X-Remote-Addr": randomIPForSpoof,
        // "X-Host": randomIPForSpoof,
        "User-Agent": getRandom()
    });

    page.setViewport({ width: 1366, height: 768 });

    console.log("[INIT] Navigating to untis page...");

    await page.goto(config.untisLoginUrl, { waitUntil: "networkidle0" });
    // await page.waitForNavigation({ waitUntil: "networkidle0" });

    console.log("[INIT] Navigating to MS Office login page...");

    //await navigation to the MS Office login page
    await Promise.all([
        page.click(LOGIN_WITH_OFFICE),
        page.waitForNavigation({ waitUntil: "networkidle0" })
    ]);

    //await email input
    console.log("[AUTH] Typing email.");

    await page.focus(MS_EMAIL_INPUT)
    await page.type(MS_EMAIL_INPUT, config.msOauth2.user);
    await (await page.$(MS_CREDENTIAL_CONFIRM))?.click();
    await wait(2000);

    //await password input
    console.log("[AUTH] Typing passphrase");
    await page.focus(MS_PASSWORD_INPUT)
    await page.type(MS_PASSWORD_INPUT, config.msOauth2.pass);
    await (await page.$(MS_CREDENTIAL_CONFIRM))?.click();

    await wait(3000);
    await (await page.$(MS_CREDENTIAL_CONFIRM))?.click();
    console.log("[AUTH] MS Office auth successful!");

    console.log("[STATUS] Waiting for WebUntis to load...");
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    console.log("[STATUS] Navigating to timetable...");
    await page.goto(config.firstWeekUrl, { waitUntil: "networkidle0", timeout: 45000 });

    console.log("[STATUS] Preparing CSV file for scraping...");
    rmSync(CSV_OUTPUT_FILEPATH, { force: true });
    appendFileSync(CSV_OUTPUT_FILEPATH, `Aktivität;Klasse;Fach;Wochentag;Datum;Dauer;Raum;Lehrkraft;${EOL}`, "utf-8");

    let done = false;
    while (!done) {
        //Acquire page's embedded untis timetable frame
        let timetableFrame = await getEmbeddedUntis(page);
        assert(timetableFrame !== null, "timetableFrame was null!");
        await wait(3000);

        const lessons: ElementHandle<HTMLDivElement>[] = await timetableFrame.$$(VALID_LESSONS_IN_TIMETABLE);

        console.log(`[SCRAPE] Scraping ${lessons.length} lessons...`);

        for (const lesson of lessons) {

            const dataArray: Array<string> = [];

            //From now on, reacquire the frame...
            const infoFrame = page.mainFrame();

            timetableFrame.evaluate(lesson => lesson.style.border = "5px solid red", lesson);
            await wait(1000);

            lesson.click();
            
            // await page.waitForNetworkIdle();
            await wait(6000);


            //Get class activity for this lesson
            const activity = await (await (await infoFrame.$(SCRAPE_ACTIVITY))?.getProperty("textContent"))?.jsonValue();

            //Gather pipe-separated info columns about this lesson
            const infoColumns = await infoFrame.$$(SCRAPE_INFOCOLUMNS);

            for (const wrappedChild of infoColumns.reverse()) {
                const text = await (await (await wrappedChild.toElement("div")).getProperty("textContent")).jsonValue();
                dataArray.push(text ?? "<No Entry>");
            }

            dataArray.push(activity ?? "<Entfall / No Activity>");

            const fmt = dataArray.reverse().join(";").replace(/[\n\r]/g, ' ');

            console.log(`[SCRAPE] ${fmt}`);

            //Emit data columns into CSV file
            appendFileSync(CSV_OUTPUT_FILEPATH, fmt + EOL, "utf-8");

            //Paginate to next page and lesson entry
            await page.goBack();
            await wait(500);
        }

        const iframeHandle = await page.$("iframe");
        const ctxFrame = await iframeHandle?.contentFrame();
        const buttons = await ctxFrame?.$$("button");

        assert(buttons !== null && buttons !== undefined, "CTXFRAME WAS NULL OR UNDEFINED");

        console.log("[STATUS] Paginating to next week...");
        buttons.at(3)?.click();

        await page.waitForNavigation({ waitUntil: "networkidle0" });
    }
})();

process.on('uncaughtException', async function (err) {
    console.log('[ERROR] Caught exception: ' + err);
    await wait(60000);
});