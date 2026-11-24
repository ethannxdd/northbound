// What to tell Claude so its plan can be imported into Northbound. Shown on Settings › Plans from Claude
// with a Copy button, and kept in docs/plan-format.md. Keep the two in step with shared/pack.ts.

export const PLAN_PROMPT = `Research a move for me and deliver it as a Northbound plan file.

About me: I live in Cape Town, South Africa, and save in rand. Northbound already covers the UK Ancestry visa, so this is for another country or route.

The move I want planned: [COUNTRY, VISA OR ROUTE, CITIES, MY JOB, WHO'S COMING]

How to deliver it:
- One JSON code block (\`\`\`json), nothing else in the block, following the format below exactly. Also offer it as a downloadable .json file if you can.
- Money in the destination currency unless a field says otherwise. Fill "currency.zarPerUnit" with today's rand per 1 unit of that currency.
- Use official sources (government and immigration sites) for visa rules and fees, and recent listings or statistics for rents and salaries. Put links in the "sources" lists and today's date in "checked".
- If you're unsure of a figure, give your best estimate and say so in "summary" or the cost's "basis".
- Ids are short lowercase words joined by hyphens, like "ireland-critical-skills". Don't use the step keys "visa-decision", "land" or "saving": Northbound adds those itself.

Format (version 1). Fields marked ? are optional:
{
  "format": "northbound-plan",
  "version": 1,
  "id": "country-route",                       // stable: re-importing the same id replaces the plan
  "title": "Dublin on a Critical Skills Employment Permit",
  "summary?": "Two or three sentences: who this route is for and the catches.",
  "createdOn?": "YYYY-MM-DD",
  "country": { "code": "IE", "name": "Ireland" },
  "currency": { "code": "EUR", "symbol": "€", "name?": "euro", "zarPerUnit": 19.6, "rateDate?": "YYYY-MM-DD" },
  "visa": {
    "name": "Critical Skills Employment Permit",
    "summary?": "text",
    "feePerPerson": 1000,                       // all application fees, per person
    "healthPerYear?": 0,                        // health surcharge or required insurance, per person per year
    "years": 2,                                 // how long the first permission lasts
    "applyMonthsBefore": 3,                     // earliest you can apply before travelling
    "decisionWeeks": 8,                         // usual wait for a decision
    "fundsMonths?": 0,                          // months of savings you must show, if any
    "partnerRelationshipYears?": 2,             // years an unmarried partner must have lived with me; null if partners can't come
    "sources?": [{ "label": "text", "url": "https://...", "checked?": "YYYY-MM-DD" }]
  },
  "move": { "flightPerPerson": 650, "depositMonths": 1, "basics": 350 },   // one-way flight from Cape Town, rent deposit in months, setting-up costs
  "cities": [{
    "id": "dublin", "name": "Dublin",
    "rent":  { "room": 950, "studio": 1600, "onebed": 2000 },   // monthly: room in a share, studio, 1-bed flat
    "bills": { "room": 80,  "studio": 180,  "onebed": 220 },    // monthly energy, water, internet, local tax
    "food": 320, "transport": 100, "phone": 20, "other": 250,   // monthly, per person
    "typicalSalary": 45000,                     // yearly gross for my job there
    "tempNightly": 95,                          // a night in a furnished short let
    "photo?": "https://images.unsplash.com/photo-...",   // a real Unsplash photo link of the city, or leave out
    "photoCredit?": "Name on Unsplash",
    "coffee?": 3.9, "wetDays?": 150, "transportNote?": "text",
    "daylight?": [12 numbers: hours of daylight per month, Jan to Dec],
    "areas?": [{ "id": "rathmines", "name": "Rathmines", "room": 1000, "commute": "15 min by bus", "vibe": "text" }],
    "sources?": [ ...as above ]
  }],
  "tax": {
    "allowance?": 0,                            // tax-free amount taken off gross first
    "bands": [{ "upTo": 44000, "rate": 0.2 }, { "upTo": null, "rate": 0.4 }],   // yearly gross, rates as fractions
    "credits?": 4000,                           // yearly tax credits taken off the tax due
    "social?": [{ "upTo": null, "rate": 0.04 }],   // social security / health / pension charges on gross, as bands
    "note?": "text", "sources?": [ ...as above ]
  },
  "documents": [{ "key": "police", "name": "Police clearance certificate", "from": "SAPS", "check": "Issued in the last 6 months",
                  "cost?": 200, "costCurrency?": "ZAR" or "local", "takes?": "4 to 8 weeks", "optional?": "Only if ...", "url?": "https://..." }],
  "extraCosts?": [{ "key": "irp", "group": "paper" | "move" | "runway", "label": "text", "amount": 300,
                    "currency": "ZAR" | "local", "perPerson?": true, "basis?": "how it's worked out", "source?": "https://..." }],
  "steps": [{ "key": "police-clearance", "title": "Order a police clearance certificate", "short?": "Police clearance",
              "line": "paper" | "money" | "move" | "trunk",       // trunk = after the visa decision
              "monthsBeforeLanding": 5,                            // or "now"; negative = after landing
              "milestone?": false, "cost?": "R200", "takes?": "text", "from?": "text", "url?": "https://...",
              "steps": ["Short instruction.", "Another."] }],
  "settlement?": { "name": "Stamp 4 permission", "years": 2, "fee?": 300,
                   "citizenshipName?": "Irish citizenship", "citizenshipYears?": 5, "citizenshipFee?": 1125,
                   "conditions": ["text"], "sources?": [ ...as above ] },
  "route?": [{ "at": 0.5, "name": "the Sahel" }],                 // places along the flight, 0 = Cape Town, 1 = the city
  "facts?": { "timeDifference?": "2 hours behind", "language?": "English" },
  "scenario": { "city": "dublin", "housing": "room" | "studio" | "onebed", "partner?": false,
                "jobHuntMonths": 2, "salary?": 0,                  // 0 = the city's typicalSalary
                "landMode": "saved" | "date", "landDate?": "YYYY-MM-DD",
                "tempNights": 21, "bufferLocal?": 0, "paperworkMonths?": 3 },
  "notes?": "Anything else worth knowing, in plain words.",
  "sources?": [ ...as above ]
}

Remove the // comments and the ? marks from the field names in your answer: the file must be plain JSON.`
