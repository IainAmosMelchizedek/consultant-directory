const { url, publishableKey } = window.SUPABASE_CONFIG;


// ============================================================
// Elements
// ============================================================

const institutionName =
    document.getElementById("institutionName");

const institutionType =
    document.getElementById("institutionType");

const addToSpsButton =
    document.getElementById("addToSpsButton");

const statusMessage =
    document.getElementById("statusMessage");

const identifiersSection =
    document.getElementById("identifiersSection");

const institutionSection =
    document.getElementById("institutionSection");

const accreditationSection =
    document.getElementById("accreditationSection");

const actionsSection =
    document.getElementById("actionsSection");

const locationsSection =
    document.getElementById("locationsSection");

const spsSection =
    document.getElementById("spsSection");

const accreditationRecords =
    document.getElementById("accreditationRecords");

const accreditationActions =
    document.getElementById("accreditationActions");

const associatedLocations =
    document.getElementById("associatedLocations");


// ============================================================
// Helpers
// ============================================================

function valueOrDash(value) {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "-"
    ) {
        return "—";
    }

    return value;
}


function setText(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            valueOrDash(value);
    }
}


function createParagraph(label, value) {
    const p =
        document.createElement("p");

    const strong =
        document.createElement("strong");

    strong.textContent =
        `${label}: `;

    p.appendChild(strong);

    p.appendChild(
        document.createTextNode(
            valueOrDash(value)
        )
    );

    return p;
}


async function supabaseRequest(
    table,
    parameters
) {
    const params =
        new URLSearchParams();

    for (
        const [key, value]
        of Object.entries(parameters)
    ) {
        params.set(key, value);
    }

    const endpoint =
        `${url}/rest/v1/${table}?${params.toString()}`;

    const response =
        await fetch(
            endpoint,
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
            `${table}: ${response.status} ${errorText}`
        );
    }

    return await response.json();
}


// ============================================================
// Load institution / location
// ============================================================

async function loadProfile() {

    try {

        // ----------------------------------------------------
        // Read DAPIP ID from the URL
        //
        // profile.html?dapip_id=122074
        // ----------------------------------------------------

        const pageParameters =
            new URLSearchParams(
                window.location.search
            );

        const dapipId =
            pageParameters.get("dapip_id");


        if (!dapipId) {
            throw new Error(
                "No DAPIP ID was supplied."
            );
        }


        // ----------------------------------------------------
        // Retrieve the selected record
        // ----------------------------------------------------

        const rows =
            await supabaseRequest(
                "institute_campuses",
                {
                    select: "*",
                    dapip_id:
                        `eq.${dapipId}`,
                    limit: "1"
                }
            );


        if (!rows.length) {
            throw new Error(
                `No institution or location was found for DAPIP ID ${dapipId}.`
            );
        }


        const institution =
            rows[0];


        // ----------------------------------------------------
        // Main heading
        // ----------------------------------------------------

        institutionName.textContent =
            valueOrDash(
                institution.location_name
            );

        institutionType.textContent =
            valueOrDash(
                institution.location_type
            );


        // ----------------------------------------------------
        // Identifiers
        // ----------------------------------------------------

        setText(
            "dapipId",
            institution.dapip_id
        );

        setText(
            "parentDapipId",
            institution.parent_dapip_id
        );

        setText(
            "opeId",
            institution.ope_id
        );

        setText(
            "ipedsId",
            institution.ipeds_unit_ids
        );


        // ----------------------------------------------------
        // Institution information
        // ----------------------------------------------------

        setText(
            "locationName",
            institution.location_name
        );

        setText(
            "parentName",
            institution.parent_name
        );

        setText(
            "locationType",
            institution.location_type
        );

        setText(
            "address",
            institution.address
        );

        setText(
            "streetAddress",
            institution.street_address
        );

        setText(
            "city",
            institution.city
        );

        setText(
            "state",
            institution.state
        );

        setText(
            "zipCode",
            institution.zip_code
        );

        setText(
            "zipPlus4",
            institution.zip_plus_4
        );

        setText(
            "addressParseStatus",
            institution.address_parse_status
        );

        setText(
            "generalPhone",
            institution.general_phone
        );

        setText(
            "adminName",
            institution.admin_name
        );

        setText(
            "adminPhone",
            institution.admin_phone
        );

        setText(
            "fax",
            institution.fax
        );

        setText(
            "updateDate",
            institution.update_date
        );


        // ----------------------------------------------------
        // Administrator email
        // ----------------------------------------------------

        const emailElement =
            document.getElementById(
                "adminEmail"
            );

        emailElement.innerHTML = "";

        if (institution.admin_email) {

            const emailLink =
                document.createElement("a");

            emailLink.href =
                `mailto:${institution.admin_email}`;

            emailLink.textContent =
                institution.admin_email;

            emailElement.appendChild(
                emailLink
            );
        }
        else {
            emailElement.textContent = "—";
        }


        // ----------------------------------------------------
        // Reveal basic profile sections
        // ----------------------------------------------------

        identifiersSection.hidden = false;
        institutionSection.hidden = false;
        spsSection.hidden = false;


        // ----------------------------------------------------
        // Enable SPS action
        //
        // ERPNext/Frappe integration comes later.
        // ----------------------------------------------------

        addToSpsButton.disabled = false;

        addToSpsButton.dataset.dapipId =
            institution.dapip_id;

        addToSpsButton.dataset.institutionName =
            institution.location_name;


        // ----------------------------------------------------
        // Load related data
        // ----------------------------------------------------

        await Promise.all([
            loadAccreditationRecords(
                institution.dapip_id
            ),

            loadAccreditationActions(
                institution.dapip_id
            ),

            loadAssociatedLocations(
                institution
            )
        ]);


        statusMessage.textContent =
            "Institution profile loaded.";

    }
    catch (error) {

        console.error(error);

        institutionName.textContent =
            "Institution Profile";

        institutionType.textContent = "";

        statusMessage.textContent =
            `Unable to load profile: ${error.message}`;
    }
}


// ============================================================
// Accreditation Records
// ============================================================

async function loadAccreditationRecords(
    dapipId
) {

    const rows =
        await supabaseRequest(
            "accreditation_records",
            {
                select: "*",

                dapip_id:
                    `eq.${dapipId}`,

                order:
                    "accreditation_date.desc"
            }
        );


    accreditationRecords.innerHTML = "";

    document.getElementById(
        "accreditationCount"
    ).textContent =
        `${rows.length.toLocaleString()} accreditation record(s).`;


    if (!rows.length) {

        const message =
            document.createElement("p");

        message.textContent =
            "No accreditation records found.";

        accreditationRecords.appendChild(
            message
        );
    }


    for (const row of rows) {

        const article =
            document.createElement("article");


        const heading =
            document.createElement("h3");

        heading.textContent =
            valueOrDash(
                row.agency_name
            );

        article.appendChild(
            heading
        );


        article.appendChild(
            createParagraph(
                "Agency ID",
                row.agency_id
            )
        );

        article.appendChild(
            createParagraph(
                "Program",
                row.program_name
            )
        );

        article.appendChild(
            createParagraph(
                "Program ID",
                row.program_id
            )
        );

        article.appendChild(
            createParagraph(
                "Sequential ID",
                row.sequential_id
            )
        );

        article.appendChild(
            createParagraph(
                "Status",
                row.accreditation_status
            )
        );

        article.appendChild(
            createParagraph(
                "Accreditation Date",
                row.accreditation_date
            )
        );

        article.appendChild(
            createParagraph(
                "Review Date",
                row.review_date
            )
        );

        article.appendChild(
            createParagraph(
                "Accreditation End Date",
                row.accreditation_end_date
            )
        );

        article.appendChild(
            createParagraph(
                "Department",
                row.department_description
            )
        );

        article.appendChild(
            createParagraph(
                "Initial Date Flag",
                row.initial_date_flag
            )
        );

        article.appendChild(
            createParagraph(
                "Ending Action ID",
                row.ending_action_id
            )
        );


        accreditationRecords.appendChild(
            article
        );
    }


    accreditationSection.hidden = false;
}


// ============================================================
// Accreditation Actions
// ============================================================

async function loadAccreditationActions(
    dapipId
) {

    const rows =
        await supabaseRequest(
            "accreditation_actions",
            {
                select: "*",

                dapip_id:
                    `eq.${dapipId}`,

                order:
                    "action_date.desc"
            }
        );


    accreditationActions.innerHTML = "";

    document.getElementById(
        "actionsCount"
    ).textContent =
        `${rows.length.toLocaleString()} accreditation action(s).`;


    if (!rows.length) {

        const message =
            document.createElement("p");

        message.textContent =
            "No accreditation actions found.";

        accreditationActions.appendChild(
            message
        );
    }


    for (const row of rows) {

        const article =
            document.createElement("article");


        const heading =
            document.createElement("h3");

        heading.textContent =
            valueOrDash(
                row.action_description
            );

        article.appendChild(
            heading
        );


        article.appendChild(
            createParagraph(
                "Agency",
                row.agency_name
            )
        );

        article.appendChild(
            createParagraph(
                "Agency ID",
                row.agency_id
            )
        );

        article.appendChild(
            createParagraph(
                "Program",
                row.program_name
            )
        );

        article.appendChild(
            createParagraph(
                "Program ID",
                row.program_id
            )
        );

        article.appendChild(
            createParagraph(
                "Sequential ID",
                row.sequential_id
            )
        );

        article.appendChild(
            createParagraph(
                "Action Date",
                row.action_date
            )
        );

        article.appendChild(
            createParagraph(
                "Justification",
                row.justification_description
            )
        );

        article.appendChild(
            createParagraph(
                "Other Justification",
                row.justification_other
            )
        );

        article.appendChild(
            createParagraph(
                "End Date",
                row.end_date
            )
        );


        accreditationActions.appendChild(
            article
        );
    }


    actionsSection.hidden = false;
}


// ============================================================
// Associated Locations / Sites
// ============================================================

async function loadAssociatedLocations(
    institution
) {

    /*
        Determine the parent institution ID.

        If this record is itself an Institution,
        use its own DAPIP ID.

        If this is an Additional Location or Site,
        use its ParentDapipId.
    */

    const parentId =
        institution.location_type === "Institution"
            ? institution.dapip_id
            : institution.parent_dapip_id;


    if (!parentId) {

        document.getElementById(
            "locationsCount"
        ).textContent =
            "No parent institution relationship available.";

        locationsSection.hidden = false;

        return;
    }


    const rows =
        await supabaseRequest(
            "institute_campuses",
            {
                select: "*",

                parent_dapip_id:
                    `eq.${parentId}`,

                order:
                    "location_type.asc,location_name.asc"
            }
        );


    /*
        Do not display the current record as one
        of its own associated locations.
    */

    const relatedRows =
        rows.filter(
            row =>
                row.dapip_id !==
                institution.dapip_id
        );


    associatedLocations.innerHTML = "";


    document.getElementById(
        "locationsCount"
    ).textContent =
        `${relatedRows.length.toLocaleString()} associated location(s) or site(s).`;


    if (!relatedRows.length) {

        const message =
            document.createElement("p");

        message.textContent =
            "No additional locations or sites found.";

        associatedLocations.appendChild(
            message
        );
    }


    for (const row of relatedRows) {

        const article =
            document.createElement("article");


        const type =
            document.createElement("strong");

        type.textContent =
            valueOrDash(
                row.location_type
            );

        article.appendChild(
            type
        );


        const heading =
            document.createElement("h3");

        heading.textContent =
            valueOrDash(
                row.location_name
            );

        article.appendChild(
            heading
        );


        article.appendChild(
            createParagraph(
                "DAPIP ID",
                row.dapip_id
            )
        );

        article.appendChild(
            createParagraph(
                "Parent Institution",
                row.parent_name
            )
        );

        article.appendChild(
            createParagraph(
                "City",
                row.city
            )
        );

        article.appendChild(
            createParagraph(
                "State",
                row.state
            )
        );

        article.appendChild(
            createParagraph(
                "Address",
                row.address
            )
        );


        const profileLink =
            document.createElement("a");

        profileLink.href =
            `profile.html?dapip_id=${encodeURIComponent(row.dapip_id)}`;

        profileLink.textContent =
            "View Location";

        article.appendChild(
            profileLink
        );


        associatedLocations.appendChild(
            article
        );
    }


    locationsSection.hidden = false;
}


// ============================================================
// SPS Client Action
// ============================================================

addToSpsButton.addEventListener(
    "click",
    () => {

        const dapipId =
            addToSpsButton.dataset.dapipId;

        const name =
            addToSpsButton.dataset.institutionName;


        /*
            This is the future integration boundary:

            Supabase public institution
                    ↓
            Add to SPS Clients
                    ↓
            Authentication
                    ↓
            ERPNext / Frappe
                    ↓
            SPS Client
                    ↓
            Engagement
                    ↓
            SOW
        */


        alert(
            `${name}\n\n` +
            `DAPIP ID: ${dapipId}\n\n` +
            `The SPS client workspace integration will be connected here.`
        );
    }
);


// ============================================================
// Startup
// ============================================================

loadProfile();