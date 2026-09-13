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

const organizationTypeFilter =
    document.getElementById("organizationTypeFilter");

const institutionControlFilter =
    document.getElementById("institutionControlFilter");

const institutionControlFilterField =
    document.getElementById("institutionControlFilterField");

const stateFilter =
    document.getElementById("stateFilter");

const locationTypeFilter =
    document.getElementById("locationTypeFilter");

const stateFilterField =
    document.getElementById("stateFilterField");

const locationTypeFilterField =
    document.getElementById("locationTypeFilterField");

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
// States and territories
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

        const option =
            document.createElement("option");

        option.value =
            code;

        option.textContent =
            `${name} (${code})`;

        stateFilter.appendChild(
            option
        );
    }
}


// ============================================================
// Filter behavior
// ============================================================

function updateFilterVisibility() {

    const organizationType =
        organizationTypeFilter.value;


    if (organizationType === "accreditors") {

        institutionControlFilter.value = "";
        stateFilter.value = "";
        locationTypeFilter.value = "";

        institutionControlFilterField.hidden = true;
        stateFilterField.hidden = true;
        locationTypeFilterField.hidden = true;

        return;
    }


    institutionControlFilterField.hidden = false;
    stateFilterField.hidden = false;
    locationTypeFilterField.hidden = false;
}


// ============================================================
// Unified directory query
// ============================================================

function buildDirectoryParams() {

    const params =
        new URLSearchParams();


    // --------------------------------------------------------
    // Return normalized public directory fields
    // --------------------------------------------------------

    params.set(
        "select",
        "*"
    );


    // --------------------------------------------------------
    // Organization type
    // --------------------------------------------------------

    const organizationType =
        organizationTypeFilter.value;


    if (organizationType === "institutions") {

        params.set(
            "organization_kind",
            "eq.institution"
        );
    }


    if (organizationType === "accreditors") {

        params.set(
            "organization_kind",
            "eq.accreditor"
        );
    }


    // --------------------------------------------------------
    // Institution-only control filter
    // --------------------------------------------------------

    const institutionControl =
        institutionControlFilter.value.trim();


    if (
        organizationType !== "accreditors" &&
        institutionControl
    ) {

        params.set(
            "institution_control",
            `eq.${institutionControl}`
        );
    }


    // --------------------------------------------------------
    // Institution-only geographic filter
    // --------------------------------------------------------

    const state =
        stateFilter.value.trim();


    if (
        organizationType !== "accreditors" &&
        state
    ) {

        params.set(
            "state",
            `eq.${state}`
        );
    }


    // --------------------------------------------------------
    // Institution-only location-type filter
    // --------------------------------------------------------

    const locationType =
        locationTypeFilter.value.trim();


    if (
        organizationType !== "accreditors" &&
        locationType
    ) {

        params.set(
            "record_type",
            `eq.${locationType}`
        );
    }


    // --------------------------------------------------------
    // Organization / identifier search
    //
    // The unified search supports:
    //
    // Institution / location name
    // Parent institution name
    // Accreditor name
    // DAPIP ID
    // OPE ID
    // IPEDS ID
    // Agency ID
    // --------------------------------------------------------

    const term =
        institutionSearch.value.trim();


    if (term) {

        const safeTerm =
            term.replace(
                /[(),]/g,
                " "
            );


        const orFilter = [
            `organization_name.ilike.*${safeTerm}*`,
            `parent_name.ilike.*${safeTerm}*`,
            `primary_id.eq.${safeTerm}`,
            `dapip_id.eq.${safeTerm}`,
            `ope_id.eq.${safeTerm}`,
            `ipeds_unit_ids.ilike.*${safeTerm}*`,
            `agency_id.eq.${safeTerm}`
        ].join(",");


        params.set(
            "or",
            `(${orFilter})`
        );
    }


    // --------------------------------------------------------
    // Stable ordering
    // --------------------------------------------------------

    params.set(
        "order",
        "organization_name.asc,organization_kind.asc,primary_id.asc"
    );


    return params;
}


// ============================================================
// Search
// ============================================================

async function searchDirectory(page = 1) {

    currentPage =
        page;

    searchButton.disabled =
        true;

    resultCount.textContent =
        "Searching...";

    resultsList.innerHTML =
        "";


    try {

        const endpoint =
            `${url}/rest/v1/directory_organizations`;

        const params =
            buildDirectoryParams();


        const start =
            (currentPage - 1) *
            PAGE_SIZE;

        const end =
            start +
            PAGE_SIZE -
            1;


        const response =
            await fetch(
                `${endpoint}?${params.toString()}`,
                {
                    method: "GET",

                    headers: {
                        "apikey":
                            publishableKey,

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


        const contentRange =
            response.headers.get(
                "content-range"
            );


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

        console.error(
            error
        );

        currentResults = [];
        totalResults = 0;

        resultCount.textContent =
            `Search failed: ${error.message}`;

        pagination.hidden =
            true;

        downloadButton.disabled =
            true;

    }
    finally {

        searchButton.disabled =
            false;
    }
}


// ============================================================
// Results
// ============================================================

function renderResults() {

    resultsList.innerHTML =
        "";


    resultCount.textContent =
        `${totalResults.toLocaleString()} record(s) found.`;


    downloadButton.disabled =
        currentResults.length === 0;


    if (!currentResults.length) {

        const empty =
            document.createElement("div");

        empty.className =
            "results-empty";


        const marker =
            document.createElement("div");

        marker.className =
            "empty-marker";

        marker.textContent =
            "SPS";


        const heading =
            document.createElement("h3");

        heading.textContent =
            "No Organizations Found";


        const message =
            document.createElement("p");

        message.textContent =
            "No institutions, locations, sites, or accrediting agencies matched the current search.";


        empty.appendChild(
            marker
        );

        empty.appendChild(
            heading
        );

        empty.appendChild(
            message
        );


        resultsList.appendChild(
            empty
        );

        return;
    }


    for (const row of currentResults) {

        if (
            row.organization_kind ===
            "accreditor"
        ) {

            renderAccreditorResult(
                row
            );

        }
        else {

            renderInstitutionResult(
                row
            );
        }
    }
}


// ============================================================
// Institution result
// ============================================================

function renderInstitutionResult(row) {

    const article =
        document.createElement("article");


    // --------------------------------------------------------
    // Record type
    // --------------------------------------------------------

    const type =
        document.createElement("strong");

    type.textContent =
        row.record_type ||
        "Institution";

    article.appendChild(
        type
    );


    // --------------------------------------------------------
    // Institution / location name
    // --------------------------------------------------------

    const heading =
        document.createElement("h3");

    heading.textContent =
        row.organization_name ||
        "Unnamed Record";

    article.appendChild(
        heading
    );


    // --------------------------------------------------------
    // Location
    // --------------------------------------------------------

    const locationParts = [
        row.city,
        row.state,
        row.zip_code
    ].filter(Boolean);


    if (locationParts.length) {

        const location =
            document.createElement("p");

        location.textContent =
            locationParts.join(", ");

        article.appendChild(
            location
        );
    }


    // --------------------------------------------------------
    // Parent institution relationship
    // --------------------------------------------------------

    if (
        row.record_type !== "Institution" &&
        row.parent_name &&
        row.parent_name !== "-"
    ) {

        const parent =
            document.createElement("p");

        parent.textContent =
            `Parent Institution: ${row.parent_name}`;

        article.appendChild(
            parent
        );


        if (row.parent_id) {

            const parentId =
                document.createElement("p");

            parentId.textContent =
                `Parent DAPIP ID: ${row.parent_id}`;

            article.appendChild(
                parentId
            );
        }
    }


    // --------------------------------------------------------
    // Federal identifiers
    // --------------------------------------------------------

    const idParts =
        [];


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


    if (idParts.length) {

        const identifiers =
            document.createElement("p");

        identifiers.textContent =
            idParts.join(" | ");

        article.appendChild(
            identifiers
        );
    }


    // --------------------------------------------------------
    // Public contact information
    // --------------------------------------------------------

    if (row.general_phone) {

        const phone =
            document.createElement("p");

        phone.textContent =
            `General Phone: ${row.general_phone}`;

        article.appendChild(
            phone
        );
    }


    if (row.admin_name) {

        const admin =
            document.createElement("p");

        admin.textContent =
            `Administrator: ${row.admin_name}`;

        article.appendChild(
            admin
        );
    }


    if (row.admin_phone) {

        const adminPhone =
            document.createElement("p");

        adminPhone.textContent =
            `Admin Phone: ${row.admin_phone}`;

        article.appendChild(
            adminPhone
        );
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


        adminEmail.appendChild(
            label
        );

        adminEmail.appendChild(
            link
        );

        article.appendChild(
            adminEmail
        );
    }


    // --------------------------------------------------------
    // Institution profile
    // --------------------------------------------------------

    if (row.dapip_id) {

        const profileLink =
            document.createElement("a");

        profileLink.href =
            `profile.html?dapip_id=${encodeURIComponent(row.dapip_id)}`;

        profileLink.textContent =
            row.record_type === "Institution"
                ? "View Institution"
                : "View Location";


        article.appendChild(
            profileLink
        );
    }


    resultsList.appendChild(
        article
    );
}


// ============================================================
// Accreditor result
// ============================================================

function renderAccreditorResult(row) {

    const article =
        document.createElement("article");


    const type =
        document.createElement("strong");

    type.textContent =
        "Accrediting Agency";

    article.appendChild(
        type
    );


    const heading =
        document.createElement("h3");

    heading.textContent =
        row.organization_name ||
        "Unnamed Accreditor";

    article.appendChild(
        heading
    );


    const identifier =
        document.createElement("p");

    identifier.textContent =
        `Agency ID: ${row.agency_id || row.primary_id || "—"}`;

    article.appendChild(
        identifier
    );


    const relationship =
        document.createElement("p");

    relationship.textContent =
        "Accreditor record";

    article.appendChild(
        relationship
    );


    const profileLink =
        document.createElement("a");

    profileLink.href =
        `accreditor-profile.html?agency_id=${encodeURIComponent(row.agency_id || row.primary_id)}`;

    profileLink.textContent =
        "View Accreditor";


    article.appendChild(
        profileLink
    );


    resultsList.appendChild(
        article
    );
}


// ============================================================
// Pagination
// ============================================================

function renderPagination() {

    const totalPages =
        Math.ceil(
            totalResults /
            PAGE_SIZE
        );


    if (totalPages <= 1) {

        pagination.hidden =
            true;

        return;
    }


    pagination.hidden =
        false;


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

    institutionSearch.value =
        "";

    organizationTypeFilter.value =
        "all";

    institutionControlFilter.value =
        "";

    stateFilter.value =
        "";

    locationTypeFilter.value =
        "";

    currentPage =
        1;

    totalResults =
        0;

    currentResults =
        [];


    updateFilterVisibility();


    resultsList.innerHTML = `
        <div class="results-empty">
            <div class="empty-marker">
                SPS
            </div>

            <h3>
                Ready to Search
            </h3>

            <p>
                Search postsecondary institutions and accrediting
                agencies by organization name or federal identifier.
            </p>
        </div>
    `;


    resultCount.textContent =
        "Enter a search term or select a filter to begin.";


    pagination.hidden =
        true;

    downloadButton.disabled =
        true;
}


// ============================================================
// CSV Download
//
// Downloads all rows matching the current unified search,
// not just the current 50-row page.
// ============================================================

async function downloadCSV() {

    downloadButton.disabled =
        true;

    const originalText =
        downloadButton.textContent;

    downloadButton.textContent =
        "Preparing download...";


    try {

        const endpoint =
            `${url}/rest/v1/directory_organizations`;

        const allRows =
            [];

        const DOWNLOAD_BATCH_SIZE =
            1000;

        let batch =
            0;


        while (true) {

            const params =
                buildDirectoryParams();


            const start =
                batch *
                DOWNLOAD_BATCH_SIZE;

            const end =
                start +
                DOWNLOAD_BATCH_SIZE -
                1;


            const response =
                await fetch(
                    `${endpoint}?${params.toString()}`,
                    {
                        method: "GET",

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


            allRows.push(
                ...rows
            );


            if (
                rows.length <
                DOWNLOAD_BATCH_SIZE
            ) {

                break;
            }


            batch++;
        }


        if (!allRows.length) {

            alert(
                "There are no results to download."
            );

            return;
        }


        const columns =
            Object.keys(
                allRows[0]
            );


        const escapeCSV =
            value => {

                if (
                    value === null ||
                    value === undefined
                ) {

                    return "";
                }


                const text =
                    String(value)
                        .replace(
                            /"/g,
                            '""'
                        );


                return `"${text}"`;
            };


        const lines = [
            columns
                .map(
                    escapeCSV
                )
                .join(",")
        ];


        for (const row of allRows) {

            lines.push(
                columns
                    .map(
                        column =>
                            escapeCSV(
                                row[column]
                            )
                    )
                    .join(",")
            );
        }


        const csv =
            lines.join(
                "\r\n"
            );


        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const objectURL =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );

        link.href =
            objectURL;

        link.download =
            "consultant-directory-results.csv";


        document.body.appendChild(
            link
        );

        link.click();

        link.remove();


        URL.revokeObjectURL(
            objectURL
        );

    }
    catch (error) {

        console.error(
            error
        );

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
    () => searchDirectory(1)
);


clearButton.addEventListener(
    "click",
    clearSearch
);


downloadButton.addEventListener(
    "click",
    downloadCSV
);


organizationTypeFilter.addEventListener(
    "change",
    updateFilterVisibility
);


previousPageButton.addEventListener(
    "click",
    () => {

        if (currentPage > 1) {

            searchDirectory(
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

            searchDirectory(
                currentPage + 1
            );
        }
    }
);


institutionSearch.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            searchDirectory(1);
        }
    }
);


// ============================================================
// Startup
// ============================================================

populateStates();
updateFilterVisibility();