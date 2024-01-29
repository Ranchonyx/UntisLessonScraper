# UntisLessonScraper
This thing scrapes lesson contents from WebUntis.  
## Requirements
Node.JS > v20.5.0  
npm (comes with node)  

Then run `npm install` in the root folder.

## Configuring the thing
To begin, create a text file `config.json` in the root folder.  
Use the following format to configure the scraper.  
```json
{
    "msOauth2": {
        "user": "YourMsAuthMailHere",
        "pass": "YourMsAuthPassHere"
    },
    "firstWeekUrl": "https://mese.webuntis.com/timetable-students-my/2023-02-27/",
    "untisLoginUrl": "https://mese.webuntis.com/WebUntis/?school=whatever#/basic/login"
}
```

If you can't manage that; Cope lol.

## Running the thing
To get the ball rolling, run `npm run start` in the root folder.

## Legal
I am not responsible for the potential damage you cause to any parties by using my software.  
Any and all problems you cause for others or yourself by using it are your own problems :-)