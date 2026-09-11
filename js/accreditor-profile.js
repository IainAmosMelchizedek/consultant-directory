const { url, publishableKey } = window.SUPABASE_CONFIG;


// ============================================================
// Elements
// ============================================================

const accreditorName =
    document.getElementById("accreditorName");

const agencyId =
    document.getElementById("agencyId");

const agencyIdDetail =
    document.getElementById("agencyIdDetail");

const agencyName =
    document.getElementById("agencyName");

const profileStatus =
    document.getElementById("profileStatus");

const institutionsCount =
    document.getElementById("institutionsCount");

const accreditedInstitutions =
    document.getElementById("accreditedInstitutions");

const accreditationCount =
    document.getElementById("accreditationCount");

const accreditationRecords =
    document.getElementById("accreditationRecords");

const actionsCount =
    document.getElementById("actionsCount");

const accreditationActions =
    document.getElementById("accreditationActions");

const addToSpsButton =
    document.getElementById("addToSpsButton");


// ============================================================
// URL parameter
// ============================================================

const pageParams =
    new URLSearchParams(
        window.location.search
    );

const requestedAgencyId =
    pageParams.get("agency_id");


// ============================================================
// Supabase request helper
// ============================================================

async function supabaseGet(
    tableName,
    params
) {

    const response =
        await fetch(
            `${url}/rest/v1/${tableName}?${params.toString()}`,
            {
                method: "GET",

                headers: {
                    "apikey":
                        publishableKey,

                    "Authorization":
                        `Bearer ${publishableKey}`
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


    return response.json();
}


// ============================================================
// Display helpers
// ============================================================

function displayValue(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "—";
    }

    return String(value);
}


function createParagraph(
    label,
    value
) {

    const paragraph =
        document.createElement("p");

    const strong =
        document.createElement("strong");

    strong.textContent =
        `${label}: `;

    paragraph.appendChild(
        strong
    );

    paragraph.appendChild(
        document.createTextNode(
            displayValue(value)
        )
    );

    return paragraph;
}


// ============================================================
// Load accreditor identity
// ============================================================

async function loadAccreditor() {

    if (!requestedAgencyId) {

        throw new Error(
            "No Agency ID was provided in the profile URL."
        );
    }


    const params =
        new URLSearchParams();

    params.set(
        "select",
        "agency_id,agency_name"
    );

    params.set(
        "agency_id",
        `eq.${requestedAgencyId}`
    );

    params.set(
        "limit",
        "1"
    );


    const rows =
        await supabaseGet(
            "accreditors",
            params
        );


    if (!rows.length) {

        throw new Error(
            `No accreditor was found for Agency ID ${requestedAgencyId}.`
        );
    }


    const accreditor =
        rows[0];


    accreditorName.textContent =
        accreditor.agency_name;

    agencyName.textContent =
        accreditor.agency_name;

    agencyId.textContent =
        accreditor.agency_id;

    agencyIdDetail.textContent =
        accreditor.agency_id;


    document.title =
        `${accreditor.agency_name} | Accreditor Profile | Safe Passage Strategies`;


    return accreditor;
}


// ============================================================
// Load accreditation records
// ============================================================

async function loadAccreditationRecords() {

    const params =
        new URLSearchParams();

    params.set(
        "select",
        "*"
    );

    params.set(
        "agency_id",
        `eq.${requestedAgencyId}`
    );

    params.set(
        "order",
        "accreditation_date.desc.nullslast,dapip_id.asc"
    );


    const rows =
        await supabaseGet(
            "accreditation_records",
            params
        );


    accreditationCount.textContent =
        `${rows.length.toLocaleString()} accreditation record(s).`;


    renderAccreditationRecords(
        rows
    );


    return rows;
}


// ============================================================
// Render accreditation records
// ============================================================

function renderAccreditationRecords(rows) {

    accreditationRecords.innerHTML =
        "";


    if (!rows.length) {

        const message =
            document.createElement("p");

        message.textContent =
            "No accreditation records were found for this accreditor.";

        accreditationRecords.appendChild(
            message
        );

        return;
    }


    for (const row of rows) {

        const article =
            document.createElement("article");


        const heading =
            document.createElement("h3");

        heading.textContent =
            row.program_name ||
            row.department_description ||
            "Institutional Accreditation Record";

        article.appendChild(
            heading
        );


        article.appendChild(
            createParagraph(
                "DAPIP ID",
                row.dapip_id
            )
        );


        if (row.program_id) {

            article.appendChild(
                createParagraph(
                    "Program ID",
                    row.program_id
                )
            );
        }


        if (row.accreditation_status) {

            article.appendChild(
                createParagraph(
                    "Status",
                    row.accreditation_status
                )
            );
        }


        if (row.accreditation_date) {

            article.appendChild(
                createParagraph(
                    "Accreditation Date",
                    row.accreditation_date
                )
            );
        }


        if (row.review_date) {

            article.appendChild(
                createParagraph(
                    "Review Date",
                    row.review_date
                )
            );
        }


        if (row.accreditation_end_date) {

            article.appendChild(
                createParagraph(
                    "Accreditation End Date",
                    row.accreditation_end_date
                )
            );
        }


        if (row.department_description) {

            article.appendChild(
                createParagraph(
                    "Department",
                    row.department_description
                )
            );
        }


        if (row.initial_date_flag) {

            article.appendChild(
                createParagraph(
                    "Initial Date Flag",
                    row.initial_date_flag
                )
            );
        }


        if (row.sequential_id) {

            article.appendChild(
                createParagraph(
                    "Sequential ID",
                    row.sequential_id
                )
            );
        }


        accreditationRecords.appendChild(
            article
        );
    }
}


// ============================================================
// Load accreditation actions
// ============================================================

async function loadAccreditationActions() {

    const params =
        new URLSearchParams();

    params.set(
        "select",
        "*"
    );

    params.set(
        "agency_id",
        `eq.${requestedAgencyId}`
    );

    params.set(
        "order",
        "action_date.desc.nullslast,dapip_id.asc"
    );


    const rows =
        await supabaseGet(
            "accreditation_actions",
            params
        );


    actionsCount.textContent =
        `${rows.length.toLocaleString()} accreditation action(s).`;


    renderAccreditationActions(
        rows
    );


    return rows;
}


// ============================================================
// Render accreditation actions
// ============================================================

function renderAccreditationActions(rows) {

    accreditationActions.innerHTML =
        "";


    if (!rows.length) {

        const message =
            document.createElement("p");

        message.textContent =
            "No accreditation actions were found for this accreditor.";

        accreditationActions.appendChild(
            message
        );

        return;
    }


    for (const row of rows) {

        const article =
            document.createElement("article");


        const heading =
            document.createElement("h3");

        heading.textContent =
            row.action_description ||
            "Accreditation Action";

        article.appendChild(
            heading
        );


        article.appendChild(
            createParagraph(
                "DAPIP ID",
                row.dapip_id
            )
        );


        if (row.program_name) {

            article.appendChild(
                createParagraph(
                    "Program",
                    row.program_name
                )
            );
        }


        if (row.action_date) {

            article.appendChild(
                createParagraph(
                    "Action Date",
                    row.action_date
                )
            );
        }


        if (row.justification_description) {

            article.appendChild(
                createParagraph(
                    "Justification",
                    row.justification_description
                )
            );
        }


        if (row.justification_other) {

            article.appendChild(
                createParagraph(
                    "Other Justification",
                    row.justification_other
                )
            );
        }


        if (row.end_date) {

            article.appendChild(
                createParagraph(
                    "End Date",
                    row.end_date
                )
            );
        }


        if (row.sequential_id) {

            article.appendChild(
                createParagraph(
                    "Sequential ID",
                    row.sequential_id
                )
            );
        }


        accreditationActions.appendChild(
            article
        );
    }
}


// ============================================================
// Build accreditor institution portfolio
//
// Institutions can appear repeatedly across accreditation
// records and accreditation actions. We collect the unique
// DAPIP IDs first, then retrieve their public directory records.
// ============================================================

async function loadAccreditedInstitutions(
    records,
    actions
) {

    const dapipIds =
        new Set();


    for (const row of records) {

        if (row.dapip_id) {

            dapipIds.add(
                row.dapip_id
            );
        }
    }


    for (const row of actions) {

        if (row.dapip_id) {

            dapipIds.add(
                row.dapip_id
            );
        }
    }


    const ids =
        Array.from(
            dapipIds
        );


    institutionsCount.textContent =
        `${ids.length.toLocaleString()} unique institution/location record(s).`;


    if (!ids.length) {

        accreditedInstitutions.innerHTML =
            "<p>No related institution records were found.</p>";

        return;
    }


    const campuses =
        [];


    // Keep individual REST requests reasonably small.
    const BATCH_SIZE =
        200;


    for (
        let start = 0;
        start < ids.length;
        start += BATCH_SIZE
    ) {

        const batch =
            ids.slice(
                start,
                start + BATCH_SIZE
            );


        const params =
            new URLSearchParams();

        params.set(
            "select",
            "dapip_id,location_name,parent_name,parent_dapip_id,location_type,city,state,zip_code,ope_id,ipeds_unit_ids"
        );

        params.set(
            "dapip_id",
            `in.(${batch.join(",")})`
        );

        params.set(
            "order",
            "location_name.asc,dapip_id.asc"
        );


        const rows =
            await supabaseGet(
                "institute_campuses",
                params
            );


        campuses.push(
            ...rows
        );
    }


    campuses.sort(
        (a, b) => {

            const nameA =
                a.location_name || "";

            const nameB =
                b.location_name || "";

            return nameA.localeCompare(
                nameB
            );
        }
    );


    renderAccreditedInstitutions(
        campuses
    );
}


// ============================================================
// Render accreditor institution portfolio
// ============================================================

function renderAccreditedInstitutions(rows) {

    accreditedInstitutions.innerHTML =
        "";


    if (!rows.length) {

        const message =
            document.createElement("p");

        message.textContent =
            "No related institution records were found.";

        accreditedInstitutions.appendChild(
            message
        );

        return;
    }


    for (const row of rows) {

        const article =
            document.createElement("article");


        const type =
            document.createElement("strong");

        type.textContent =
            row.location_type ||
            "Institution";

        article.appendChild(
            type
        );


        const heading =
            document.createElement("h3");

        heading.textContent =
            row.location_name ||
            "Unnamed Institution";

        article.appendChild(
            heading
        );


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


        if (
            row.location_type !== "Institution" &&
            row.parent_name
        ) {

            article.appendChild(
                createParagraph(
                    "Parent Institution",
                    row.parent_name
                )
            );
        }


        article.appendChild(
            createParagraph(
                "DAPIP ID",
                row.dapip_id
            )
        );


        if (row.ope_id) {

            article.appendChild(
                createParagraph(
                    "OPE ID",
                    row.ope_id
                )
            );
        }


        if (row.ipeds_unit_ids) {

            article.appendChild(
                createParagraph(
                    "IPEDS ID",
                    row.ipeds_unit_ids
                )
            );
        }


        const profileLink =
            document.createElement("a");

        profileLink.href =
            `profile.html?dapip_id=${encodeURIComponent(row.dapip_id)}`;

        profileLink.textContent =
            row.location_type === "Institution"
                ? "View Institution"
                : "View Location";


        article.appendChild(
            profileLink
        );


        accreditedInstitutions.appendChild(
            article
        );
    }
}


// ============================================================
// SPS client boundary
// ============================================================

function configureSpsButton(
    accreditor
) {

    addToSpsButton.addEventListener(
        "click",
        () => {

            alert(
                [
                    "SPS Client integration boundary",
                    "",
                    accreditor.agency_name,
                    `Agency ID: ${accreditor.agency_id}`,
                    "",
                    "This accrediting agency can later be added to the private SPS client workflow."
                ].join("\n")
            );
        }
    );
}


// ============================================================
// Page load
// ============================================================

async function loadProfile() {

    try {

        const accreditor =
            await loadAccreditor();


        const [
            records,
            actions
        ] =
            await Promise.all([
                loadAccreditationRecords(),
                loadAccreditationActions()
            ]);


        await loadAccreditedInstitutions(
            records,
            actions
        );


        configureSpsButton(
            accreditor
        );


        profileStatus.innerHTML =
            "<p>Accreditor profile loaded.</p>";

    }
    catch (error) {

        console.error(
            error
        );


        profileStatus.innerHTML =
            `<p>Unable to load accreditor profile: ${error.message}</p>`;


        institutionsCount.textContent =
            "Unable to load.";

        accreditationCount.textContent =
            "Unable to load.";

        actionsCount.textContent =
            "Unable to load.";


        addToSpsButton.disabled =
            true;
    }
}


loadProfile();