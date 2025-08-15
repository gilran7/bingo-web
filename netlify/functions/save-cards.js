const store = getStore({
    name: "bingo-cards-venta",
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN,
});