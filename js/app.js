const { url, publishableKey } = window.SUPABASE_CONFIG;


// ============================================================
// Configuration
// ============================================================

const PAGE_SIZE = 50;


// ============================================================
// Elements
// ============================================================

const institutionSearch =
    document.getElementById("institutionSearch");

const stateFilter =
    document.getElementById("stateFilter");

const locationTypeFilter =
    document.getElementById("locationTypeFilter");

const searchButton =
    document.getElementById("searchButton");

const clearButton =
    document.getElementById("clearButton");

const downloadButton =
    document.getElementById("downloadButton");

const resultCount =
    document.getElementById("resultCount");

const resultsList =
    document.getElementById("resultsList");

const pagination =
    document.getElementById("pagination");

const previousPageButton =
    document.getElementById("previousPageButton");

const nextPageButton =
    document.getElementById("nextPageButton");

const pageStatus =
    document.getElementById("pageStatus");


// ============================================================
// Application state
// ============================================================

let currentPage = 1;
let totalResults = 0;
let currentResults = [];


// ============================================================
// States
// ============================================================

const STATES = [
    ["AL", "Alabama"],
    ["AK", "Alaska"],
    ["AZ", "Arizona"],
    ["AR", "Arkansas"],
    ["CA", "California"],
    ["CO", "Colorado"],
    ["CT", "Connecticut"],
    ["DE", "Delaware"],
    ["DC", "District of Columbia"],
    ["FL", "Florida"],
    ["GA", "Georgia"],
    ["HI", "Hawaii"],
    ["ID", "Idaho"],
    ["IL", "Illinois"],
    ["IN", "Indiana"],
    ["IA", "Iowa"],
    ["KS", "Kansas"],
    ["KY", "Kentucky"],
    ["LA", "Louisiana"],
    ["ME", "Maine"],
    ["MD", "Maryland"],
    ["MA", "Massachusetts"],
    ["MI", "Michigan"],
    ["MN", "Minnesota"],
    ["MS", "Mississippi"],
    ["MO", "Missouri"],
    ["MT", "Montana"],
    ["NE", "Nebraska"],
    ["NV", "Nevada"],
    ["NH", "New Hampshire"],
    ["NJ", "New Jersey"],
    ["NM", "New Mexico"],
    ["NY", "New York"],
    ["NC", "North Carolina"],
    ["ND", "North Dakota"],
    ["OH", "Ohio"],
    ["OK", "Oklahoma"],
    ["OR", "Oregon"],
    ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"],
    ["SC", "South Carolina"],
    ["SD", "South Dakota"],
    ["TN", "Tennessee"],
    ["TX", "Texas"],
    ["UT", "Utah"],
    ["VT", "Vermont"],
    ["VA", "Virginia"],
    ["WA", "Washington"],
    ["WV", "West Virginia"],
    ["WI", "Wisconsin"],
    ["WY", "Wyoming"],

    ["PR", "Puerto Rico"],
    ["GU", "Guam"],
    ["VI", "U.S. Virgin Islands"],
    ["AS", "American Samoa"],
    ["MP", "Northern Mariana Islands"]
];


function populateStates() {
    for (const [code, name] of STATES) {
        const option = document.createElement("option");

        option.value = code;
        option.textContent = `${name} (${code})`;

        stateFilter.appendChild(option);
    }
}


// ============================================================
// Supabase request
// ============================================================

async function searchInstitutions(page = 1) {

    currentPage = page;

    searchButton.disabled = true;

    resultCount.textContent = "Searching...";

    resultsList.innerHTML = "";

    try {

        const endpoint =
    `${url}/rest/v1/institute_campuses`;

const params =
    new URLSearchParams();


        // ----------------------------------------------------
        // Return every public column
        // ----------------------------------------------------

        params.set(
            "select",
            "*"
        );


        // ----------------------------------------------------
        // State filter
        // ----------------------------------------------------

        const state =
            stateFilter.value.trim();

        if (state) {
            params.set(
                "state",
                `eq.${state}`
            );
        }


        // ----------------------------------------------------
        // Location type filter
        // ----------------------------------------------------

        const locationType =
            locationTypeFilter.value.trim();

        if (locationType) {
            params.set(
                "location_type",
                `eq.${locationType}`
            );
        }


        // ----------------------------------------------------
        // Institution / ID search
        //
        // One search box can look for:
        //
        // Institution name
        // Parent institution name
        // DAPIP ID
        // OPE ID
        // IPEDS ID
        // ----------------------------------------------------

        const term =
            institutionSearch.value.trim();

        if (term) {

            const safeTerm =
                term.replace(/[(),]/g, " ");

            const orFilter = [
                `location_name.ilike.*${safeTerm}*`,
                `parent_name.ilike.*${safeTerm}*`,
                `dapip_id.eq.${safeTerm}`,
                `ope_id.eq.${safeTerm}`,
                `ipeds_unit_ids.ilike.*${safeTerm}*`
            ].join(",");

            params.set(
                "or",
                `(${orFilter})`
            );
        }


        // ----------------------------------------------------
        // Stable ordering
        // ----------------------------------------------------

        params.set(
            "order",
            "location_name.asc,dapip_id.asc"
        );


        // ----------------------------------------------------
        // Pagination
        // ----------------------------------------------------

        const start =
            (currentPage - 1) * PAGE_SIZE;

        const end =
            start + PAGE_SIZE - 1;


        const response = await fetch(
    `${endpoint}?${params.toString()}`,
            {
                method: "GET",

                headers: {
                    "apikey": publishableKey,

                    "Authorization":
                        `Bearer ${publishableKey}`,

                    "Prefer":
                        "count=exact",

                    "Range":
                        `${start}-${end}`
                }
            }
        );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Supabase returned ${response.status}: ${errorText}`
            );
        }


        currentResults =
            await response.json();


        // ----------------------------------------------------
        // Exact total count
        //
        // Example:
        // Content-Range: 0-49/1215
        // ----------------------------------------------------

        const contentRange =
            response.headers.get("content-range");

        if (
            contentRange &&
            contentRange.includes("/")
        ) {

            const totalText =
                contentRange.split("/")[1];

            totalResults =
                totalText === "*"
                    ? currentResults.length
                    : Number(totalText);
        }
        else {
            totalResults =
                currentResults.length;
        }


        renderResults();
        renderPagination();

    }
    catch (error) {

        console.error(error);

        currentResults = [];
        totalResults = 0;

        resultCount.textContent =
            `Search failed: ${error.message}`;

        pagination.hidden = true;
        downloadButton.disabled = true;
    }
    finally {

        searchButton.disabled = false;
    }
}


// ============================================================
// Results
// ============================================================

function renderResults() {

    resultsList.innerHTML = "";

    resultCount.textContent =
        `${totalResults.toLocaleString()} record(s) found.`;

    downloadButton.disabled =
        currentResults.length === 0;


    if (!currentResults.length) {

        const message =
            document.createElement("p");

        message.textContent =
            "No matching institutions or locations were found.";

        resultsList.appendChild(message);

        return;
    }


    for (const row of currentResults) {

        const article =
            document.createElement("article");


        // ----------------------------------------------------
        // Type
        // ----------------------------------------------------

        const type =
            document.createElement("strong");

        type.textContent =
            row.location_type || "Unknown Type";

        article.appendChild(type);


        // ----------------------------------------------------
        // Institution / location name
        // ----------------------------------------------------

        const heading =
            document.createElement("h3");

        heading.textContent =
            row.location_name || "Unnamed Record";

        article.appendChild(heading);


        // ----------------------------------------------------
        // Location
        // ----------------------------------------------------

        const location =
            document.createElement("p");

        const locationParts = [
            row.city,
            row.state,
            row.zip_code
        ].filter(Boolean);

        location.textContent =
            locationParts.join(", ");

        article.appendChild(location);


        // ----------------------------------------------------
        // Parent relationship
        //
        // Additional locations and sites must clearly show
        // the institution with which they are associated.
        // ----------------------------------------------------

        if (
            row.location_type !== "Institution" &&
            row.parent_name &&
            row.parent_name !== "-"
        ) {

            const parent =
                document.createElement("p");

            parent.textContent =
                `Parent Institution: ${row.parent_name}`;

            article.appendChild(parent);


            if (row.parent_dapip_id) {

                const parentId =
                    document.createElement("p");

                parentId.textContent =
                    `Parent DAPIP ID: ${row.parent_dapip_id}`;

                article.appendChild(parentId);
            }
        }


        // ----------------------------------------------------
        // Identifiers
        // ----------------------------------------------------

        const identifiers =
            document.createElement("p");

        const idParts = [];

        if (row.dapip_id) {
            idParts.push(
                `DAPIP ID: ${row.dapip_id}`
            );
        }

        if (row.ope_id) {
            idParts.push(
                `OPE ID: ${row.ope_id}`
            );
        }

        if (row.ipeds_unit_ids) {
            idParts.push(
                `IPEDS ID: ${row.ipeds_unit_ids}`
            );
        }

        identifiers.textContent =
            idParts.join(" | ");

        article.appendChild(identifiers);


        // ----------------------------------------------------
        // Public contact information
        // ----------------------------------------------------

        if (row.general_phone) {

            const phone =
                document.createElement("p");

            phone.textContent =
                `General Phone: ${row.general_phone}`;

            article.appendChild(phone);
        }


        if (row.admin_name) {

            const admin =
                document.createElement("p");

            admin.textContent =
                `Administrator: ${row.admin_name}`;

            article.appendChild(admin);
        }


        if (row.admin_phone) {

            const adminPhone =
                document.createElement("p");

            adminPhone.textContent =
                `Admin Phone: ${row.admin_phone}`;

            article.appendChild(adminPhone);
        }


        if (row.admin_email) {

            const adminEmail =
                document.createElement("p");

            const label =
                document.createTextNode(
                    "Admin Email: "
                );

            const link =
                document.createElement("a");

            link.href =
                `mailto:${row.admin_email}`;

            link.textContent =
                row.admin_email;

            adminEmail.appendChild(label);
            adminEmail.appendChild(link);

            article.appendChild(adminEmail);
        }


        // ----------------------------------------------------
        // Profile link
        //
        // We will build profile.html next.
        // ----------------------------------------------------

        const profileLink =
            document.createElement("a");

        profileLink.href =
            `profile.html?dapip_id=${encodeURIComponent(row.dapip_id)}`;

        profileLink.textContent =
            row.location_type === "Institution"
                ? "View Institution"
                : "View Location";

        article.appendChild(profileLink);


        resultsList.appendChild(article);
    }
}


// ============================================================
// Pagination
// ============================================================

function renderPagination() {

    const totalPages =
        Math.ceil(
            totalResults / PAGE_SIZE
        );

    if (totalPages <= 1) {

        pagination.hidden = true;

        return;
    }


    pagination.hidden = false;


    pageStatus.textContent =
        `Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()}`;


    previousPageButton.disabled =
        currentPage <= 1;


    nextPageButton.disabled =
        currentPage >= totalPages;
}


// ============================================================
// Clear
// ============================================================

function clearSearch() {

    institutionSearch.value = "";

    stateFilter.value = "";

    locationTypeFilter.value = "";

    currentPage = 1;

    totalResults = 0;

    currentResults = [];

    resultsList.innerHTML = "";

    resultCount.textContent =
        "Enter a search or select a state to begin.";

    pagination.hidden = true;

    downloadButton.disabled = true;
}


// ============================================================
// CSV Download
//
// Downloads all rows matching the current filters,
// not just the current 50-row page.
// ============================================================

async function downloadCSV() {

    downloadButton.disabled = true;

    const originalText =
        downloadButton.textContent;

    downloadButton.textContent =
        "Preparing download...";

    try {

        const allRows = [];

        let page = 0;

        const DOWNLOAD_BATCH_SIZE = 1000;


        while (true) {

            const endpoint =
                new URL(
                    `${url}/rest/v1/institute_campuses`
                );


            params.set(
                "select",
                "*"
            );


            const state =
                stateFilter.value.trim();

            if (state) {

                params.set(
                    "state",
                    `eq.${state}`
                );
            }


            const locationType =
                locationTypeFilter.value.trim();

            if (locationType) {

                params.set(
                    "location_type",
                    `eq.${locationType}`
                );
            }


            const term =
                institutionSearch.value.trim();

            if (term) {

                const safeTerm =
                    term.replace(/[(),]/g, " ");

                const orFilter = [
                    `location_name.ilike.*${safeTerm}*`,
                    `parent_name.ilike.*${safeTerm}*`,
                    `dapip_id.eq.${safeTerm}`,
                    `ope_id.eq.${safeTerm}`,
                    `ipeds_unit_ids.ilike.*${safeTerm}*`
                ].join(",");

                params.set(
                    "or",
                    `(${orFilter})`
                );
            }


            params.set(
                "order",
                "location_name.asc,dapip_id.asc"
            );


            const start =
                page * DOWNLOAD_BATCH_SIZE;

            const end =
                start +
                DOWNLOAD_BATCH_SIZE -
                1;


            const response =
                await fetch(
                    endpoint.toString(),
                    {
                        headers: {
                            "apikey":
                                publishableKey,

                            "Authorization":
                                `Bearer ${publishableKey}`,

                            "Range":
                                `${start}-${end}`
                        }
                    }
                );


            if (!response.ok) {

                throw new Error(
                    await response.text()
                );
            }


            const rows =
                await response.json();


            allRows.push(...rows);


            if (
                rows.length <
                DOWNLOAD_BATCH_SIZE
            ) {
                break;
            }


            page++;
        }


        if (!allRows.length) {

            alert(
                "There are no results to download."
            );

            return;
        }


        const columns =
            Object.keys(allRows[0]);


        const escapeCSV = value => {

            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }

            const text =
                String(value)
                    .replace(/"/g, '""');

            return `"${text}"`;
        };


        const lines = [
            columns
                .map(escapeCSV)
                .join(",")
        ];


        for (const row of allRows) {

            lines.push(
                columns
                    .map(
                        column =>
                            escapeCSV(row[column])
                    )
                    .join(",")
            );
        }


        const csv =
            lines.join("\r\n");


        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const objectURL =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");

        link.href =
            objectURL;

        link.download =
            "consultant-directory-results.csv";


        document.body.appendChild(link);

        link.click();

        link.remove();


        URL.revokeObjectURL(
            objectURL
        );

    }
    catch (error) {

        console.error(error);

        alert(
            `Download failed: ${error.message}`
        );
    }
    finally {

        downloadButton.disabled =
            currentResults.length === 0;

        downloadButton.textContent =
            originalText;
    }
}


// ============================================================
// Events
// ============================================================

searchButton.addEventListener(
    "click",
    () => searchInstitutions(1)
);


clearButton.addEventListener(
    "click",
    clearSearch
);


downloadButton.addEventListener(
    "click",
    downloadCSV
);


previousPageButton.addEventListener(
    "click",
    () => {

        if (currentPage > 1) {
            searchInstitutions(
                currentPage - 1
            );
        }
    }
);


nextPageButton.addEventListener(
    "click",
    () => {

        const totalPages =
            Math.ceil(
                totalResults /
                PAGE_SIZE
            );

        if (
            currentPage <
            totalPages
        ) {

            searchInstitutions(
                currentPage + 1
            );
        }
    }
);


institutionSearch.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            searchInstitutions(1);
        }
    }
);


// ============================================================
// Startup
// ============================================================

populateStates();