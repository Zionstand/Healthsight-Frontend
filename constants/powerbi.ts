// Power BI "Publish to web" report, provided by the Power BI analyst.
// Override per environment with NEXT_PUBLIC_POWERBI_ASSESSMENT_URL.
//
// Note: "Publish to web" links are public — anyone with the URL can view the
// report without signing in. Putting it behind our login hides the link, it
// does not secure the data.
export const POWERBI_ASSESSMENT_REPORT_URL =
  process.env.NEXT_PUBLIC_POWERBI_ASSESSMENT_URL ||
  "https://app.powerbi.com/view?r=eyJrIjoiZmNlZGEwYWEtYWRjMy00NWNlLTk2OTgtZTVmNWQxMDcwOTY3IiwidCI6IjJkZjMyNDhlLTc5YTItNGI5NC1iNzM1LTA1NTZkMTVhNTkzZiJ9"
