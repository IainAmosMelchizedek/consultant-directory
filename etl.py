from pathlib import Path
import os

import pandas as pd
import psycopg
from dotenv import load_dotenv


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
WORKBOOK = BASE_DIR / "data" / "Post2ndarySchools_Working.xlsx"
IPEDS_SOURCE = BASE_DIR / "data" / "source" / "ipeds" / "hd2024.csv"

load_dotenv(BASE_DIR / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL was not found in .env")


# ---------------------------------------------------------
# Source worksheets
# ---------------------------------------------------------

SHEETS = {
    "InstituteCampuses": "institute_campuses",
    "AccreditationRecords": "accreditation_records",
    "AccreditationActions": "accreditation_actions",
}


# ---------------------------------------------------------
# Column mappings
# Excel column -> PostgreSQL column
# ---------------------------------------------------------

COLUMN_MAPS = {
    "InstituteCampuses": {
        "DapipId": "dapip_id",
        "OpeId": "ope_id",
        "IpedsUnitIds": "ipeds_unit_ids",
        "LocationName": "location_name",
        "ParentName": "parent_name",
        "ParentDapipId": "parent_dapip_id",
        "LocationType": "location_type",
        "Address": "address",
        "StreetAddress": "street_address",
        "City": "city",
        "State": "state",
        "ZIPCode": "zip_code",
        "ZIPPlus4": "zip_plus_4",
        "AddressParseStatus": "address_parse_status",
        "GeneralPhone": "general_phone",
        "AdminName": "admin_name",
        "AdminPhone": "admin_phone",
        "AdminEmail": "admin_email",
        "Fax": "fax",
        "UpdateDate": "update_date",
    },

    "AccreditationRecords": {
        "DapipId": "dapip_id",
        "AgencyId": "agency_id",
        "AgencyName": "agency_name",
        "ProgramId": "program_id",
        "ProgramName": "program_name",
        "SequentialId": "sequential_id",
        "InitialDateFlag": "initial_date_flag",
        "AccreditationDate": "accreditation_date",
        "AccreditationStatus": "accreditation_status",
        "ReviewDate": "review_date",
        "DepartmentDescription": "department_description",
        "AccreditationEndDate": "accreditation_end_date",
        "EndingActionId": "ending_action_id",
    },

    "AccreditationActions": {
        "DapipId": "dapip_id",
        "AgencyId": "agency_id",
        "AgencyName": "agency_name",
        "ProgramId": "program_id",
        "ProgramName": "program_name",
        "SequentialId": "sequential_id",
        "ActionDescription": "action_description",
        "ActionDate": "action_date",
        "JustificationDescription": "justification_description",
        "JustificationOther": "justification_other",
        "EndDate": "end_date",
    },
}


# ---------------------------------------------------------
# PostgreSQL schema
# ---------------------------------------------------------

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS institute_campuses (
    dapip_id TEXT PRIMARY KEY,
    ope_id TEXT,
    ipeds_unit_ids TEXT,
    ipeds_control_code TEXT,
    institution_control TEXT,
    location_name TEXT,
    parent_name TEXT,
    parent_dapip_id TEXT,
    location_type TEXT,
    address TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    zip_plus_4 TEXT,
    address_parse_status TEXT,
    general_phone TEXT,
    admin_name TEXT,
    admin_phone TEXT,
    admin_email TEXT,
    fax TEXT,
    update_date TEXT
);


CREATE TABLE IF NOT EXISTS ipeds_institutions (
    unitid TEXT PRIMARY KEY,
    institution_name TEXT NOT NULL,
    ope_id TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    general_phone TEXT,
    web_address TEXT,
    chief_name TEXT,
    chief_title TEXT,
    control_code TEXT NOT NULL,
    cyactive TEXT,
    death_year TEXT,
    closed_date TEXT,
    control_label TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS accreditors (
    agency_id TEXT PRIMARY KEY,
    agency_name TEXT NOT NULL UNIQUE
);


CREATE TABLE IF NOT EXISTS accreditation_records (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dapip_id TEXT NOT NULL
        REFERENCES institute_campuses(dapip_id),
    agency_id TEXT,
    agency_name TEXT,
    program_id TEXT,
    program_name TEXT,
    sequential_id TEXT,
    initial_date_flag TEXT,
    accreditation_date TEXT,
    accreditation_status TEXT,
    review_date TEXT,
    department_description TEXT,
    accreditation_end_date TEXT,
    ending_action_id TEXT
);


CREATE TABLE IF NOT EXISTS accreditation_actions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dapip_id TEXT NOT NULL
        REFERENCES institute_campuses(dapip_id),
    agency_id TEXT,
    agency_name TEXT,
    program_id TEXT,
    program_name TEXT,
    sequential_id TEXT,
    action_description TEXT,
    action_date TEXT,
    justification_description TEXT,
    justification_other TEXT,
    end_date TEXT
);


CREATE INDEX IF NOT EXISTS idx_institute_state
    ON institute_campuses(state);

CREATE INDEX IF NOT EXISTS idx_institute_location_type
    ON institute_campuses(location_type);

CREATE INDEX IF NOT EXISTS idx_institute_parent_dapip
    ON institute_campuses(parent_dapip_id);

CREATE INDEX IF NOT EXISTS idx_accreditors_name
    ON accreditors(agency_name);

CREATE INDEX IF NOT EXISTS idx_records_dapip
    ON accreditation_records(dapip_id);

CREATE INDEX IF NOT EXISTS idx_records_agency
    ON accreditation_records(agency_id);

CREATE INDEX IF NOT EXISTS idx_records_status
    ON accreditation_records(accreditation_status);

CREATE INDEX IF NOT EXISTS idx_actions_dapip
    ON accreditation_actions(dapip_id);

CREATE INDEX IF NOT EXISTS idx_actions_agency
    ON accreditation_actions(agency_id);


ALTER TABLE institute_campuses
    ADD COLUMN IF NOT EXISTS ipeds_control_code TEXT;

ALTER TABLE institute_campuses
    ADD COLUMN IF NOT EXISTS institution_control TEXT;

ALTER TABLE institute_campuses
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE ipeds_institutions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE accreditors
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE accreditation_records
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE accreditation_actions
    ENABLE ROW LEVEL SECURITY;
"""


# ---------------------------------------------------------
# Accreditor relationships
# ---------------------------------------------------------

RELATIONSHIP_SQL = """
ALTER TABLE accreditation_records
DROP CONSTRAINT IF EXISTS fk_accreditation_records_accreditor;

ALTER TABLE accreditation_records
ADD CONSTRAINT fk_accreditation_records_accreditor
FOREIGN KEY (agency_id)
REFERENCES accreditors(agency_id);


ALTER TABLE accreditation_actions
DROP CONSTRAINT IF EXISTS fk_accreditation_actions_accreditor;

ALTER TABLE accreditation_actions
ADD CONSTRAINT fk_accreditation_actions_accreditor
FOREIGN KEY (agency_id)
REFERENCES accreditors(agency_id);
"""


# ---------------------------------------------------------
# Unified public directory view
#
# One normalized read model for:
#   - institutions
#   - additional locations
#   - sites
#   - accrediting agencies
#
# The underlying source tables remain authoritative.
# ---------------------------------------------------------

DIRECTORY_VIEW_SQL = """
CREATE OR REPLACE VIEW public.directory_organizations
WITH (security_invoker = true)
AS

SELECT
    'institution'::TEXT AS organization_kind,
    location_type::TEXT AS record_type,

    dapip_id::TEXT AS primary_id,
    location_name::TEXT AS organization_name,

    parent_name::TEXT AS parent_name,
    parent_dapip_id::TEXT AS parent_id,

    dapip_id::TEXT AS dapip_id,
    ope_id::TEXT AS ope_id,
    ipeds_unit_ids::TEXT AS ipeds_unit_ids,

    NULL::TEXT AS agency_id,

    address::TEXT AS address,
    street_address::TEXT AS street_address,
    city::TEXT AS city,
    state::TEXT AS state,
    zip_code::TEXT AS zip_code,
    zip_plus_4::TEXT AS zip_plus_4,

    general_phone::TEXT AS general_phone,
    admin_name::TEXT AS admin_name,
    admin_phone::TEXT AS admin_phone,
    admin_email::TEXT AS admin_email,
    fax::TEXT AS fax,

    update_date::TEXT AS update_date,

    ipeds_control_code::TEXT AS ipeds_control_code,
    institution_control::TEXT AS institution_control

FROM public.institute_campuses


UNION ALL


SELECT
    'accreditor'::TEXT AS organization_kind,
    'Accrediting Agency'::TEXT AS record_type,

    agency_id::TEXT AS primary_id,
    agency_name::TEXT AS organization_name,

    NULL::TEXT AS parent_name,
    NULL::TEXT AS parent_id,

    NULL::TEXT AS dapip_id,
    NULL::TEXT AS ope_id,
    NULL::TEXT AS ipeds_unit_ids,

    agency_id::TEXT AS agency_id,

    NULL::TEXT AS address,
    NULL::TEXT AS street_address,
    NULL::TEXT AS city,
    NULL::TEXT AS state,
    NULL::TEXT AS zip_code,
    NULL::TEXT AS zip_plus_4,

    NULL::TEXT AS general_phone,
    NULL::TEXT AS admin_name,
    NULL::TEXT AS admin_phone,
    NULL::TEXT AS admin_email,
    NULL::TEXT AS fax,

    NULL::TEXT AS update_date,

    NULL::TEXT AS ipeds_control_code,
    NULL::TEXT AS institution_control

FROM public.accreditors;
"""


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def load_sheet(sheet_name):
    print(f"Reading {sheet_name}...")

    df = pd.read_excel(
        WORKBOOK,
        sheet_name=sheet_name,
        dtype=str,
        keep_default_na=False,
    )

    expected = list(
        COLUMN_MAPS[sheet_name].keys()
    )

    if list(df.columns) != expected:
        raise RuntimeError(
            f"{sheet_name} columns do not match "
            "the expected workbook structure."
        )

    df = df.rename(
        columns=COLUMN_MAPS[sheet_name]
    )

    # Convert blank strings and spreadsheet null values
    # to Python None / SQL NULL.
    df = df.map(
        lambda value: None
        if (
            value is None
            or pd.isna(value)
            or str(value).strip().lower()
            in {"", "nan", "nat"}
        )
        else str(value).strip()
    )

    return df


# ---------------------------------------------------------
# IPEDS institutional directory source
# ---------------------------------------------------------

IPEDS_CONTROL_LABELS = {
    "1": "Public",
    "2": "Private nonprofit",
    "3": "Private for-profit",
    "-3": "Unclassified",
}


def load_ipeds():
    print("Reading IPEDS HD2024...")

    columns = [
        "UNITID",
        "INSTNM",
        "OPEID",
        "ADDR",
        "CITY",
        "STABBR",
        "ZIP",
        "GENTELE",
        "WEBADDR",
        "CHFNM",
        "CHFTITLE",
        "CONTROL",
        "CYACTIVE",
        "DEATHYR",
        "CLOSEDAT",
    ]

    df = pd.read_csv(
        IPEDS_SOURCE,
        dtype=str,
        keep_default_na=False,
        usecols=columns,
    )

    df = df.rename(columns={
        "UNITID": "unitid",
        "INSTNM": "institution_name",
        "OPEID": "ope_id",
        "ADDR": "address",
        "CITY": "city",
        "STABBR": "state",
        "ZIP": "zip_code",
        "GENTELE": "general_phone",
        "WEBADDR": "web_address",
        "CHFNM": "chief_name",
        "CHFTITLE": "chief_title",
        "CONTROL": "control_code",
        "CYACTIVE": "cyactive",
        "DEATHYR": "death_year",
        "CLOSEDAT": "closed_date",
    })

    df = df.map(
        lambda value: None
        if (
            value is None
            or pd.isna(value)
            or str(value).strip().lower()
            in {"", "nan", "nat"}
        )
        else str(value).strip()
    )

    df["control_label"] = df["control_code"].map(
        IPEDS_CONTROL_LABELS
    )

    return df


def enrich_campuses_with_ipeds_control(campuses, ipeds):
    print("Enriching campuses with IPEDS institutional control...")

    control_lookup = dict(zip(
        ipeds["unitid"],
        ipeds["control_code"],
    ))

    def direct_control(ipeds_unit_ids):
        if ipeds_unit_ids is None:
            return None

        unitids = [
            value.strip()
            for value in str(ipeds_unit_ids).split(",")
            if value.strip()
        ]

        controls = sorted({
            control_lookup[unitid]
            for unitid in unitids
            if unitid in control_lookup
        })

        if len(controls) > 1:
            raise RuntimeError(
                "A DAPIP record maps to conflicting IPEDS CONTROL values."
            )

        return controls[0] if controls else None

    enriched = campuses.copy()

    enriched["ipeds_control_code"] = (
        enriched["ipeds_unit_ids"]
        .apply(direct_control)
    )

    direct_count = enriched[
        "ipeds_control_code"
    ].notna().sum()

    parent_controls = (
        enriched.loc[
            enriched["location_type"].eq("Institution"),
            ["dapip_id", "ipeds_control_code"],
        ]
        .set_index("dapip_id")["ipeds_control_code"]
        .to_dict()
    )

    inherited = enriched[
        "parent_dapip_id"
    ].map(parent_controls)

    inherit_mask = (
        enriched["ipeds_control_code"].isna()
        & enriched["location_type"].ne("Institution")
        & inherited.notna()
    )

    enriched.loc[
        inherit_mask,
        "ipeds_control_code",
    ] = inherited[inherit_mask]

    enriched["institution_control"] = (
        enriched["ipeds_control_code"]
        .map(IPEDS_CONTROL_LABELS)
    )

    print(
        f"Direct IPEDS control matches: "
        f"{direct_count:,}"
    )
    print(
        f"Inherited from parent:        "
        f"{inherit_mask.sum():,}"
    )
    print(
        f"Total control classified:     "
        f"{enriched['institution_control'].notna().sum():,}"
    )

    return enriched


def build_accreditors(records, actions):
    print("Building accreditor entities...")

    record_agencies = records[
        ["agency_id", "agency_name"]
    ].copy()

    action_agencies = actions[
        ["agency_id", "agency_name"]
    ].copy()

    agencies = pd.concat(
        [
            record_agencies,
            action_agencies,
        ],
        ignore_index=True,
    )

    if agencies["agency_id"].isna().any():
        raise RuntimeError(
            "Accreditation data contains "
            "a blank AgencyId."
        )

    if agencies["agency_name"].isna().any():
        raise RuntimeError(
            "Accreditation data contains "
            "a blank AgencyName."
        )

    id_name_counts = (
        agencies
        .groupby("agency_id")["agency_name"]
        .nunique()
    )

    conflicting_ids = id_name_counts[
        id_name_counts > 1
    ]

    if len(conflicting_ids):
        raise RuntimeError(
            "One or more AgencyId values map "
            "to multiple AgencyName values."
        )

    name_id_counts = (
        agencies
        .groupby("agency_name")["agency_id"]
        .nunique()
    )

    conflicting_names = name_id_counts[
        name_id_counts > 1
    ]

    if len(conflicting_names):
        raise RuntimeError(
            "One or more AgencyName values map "
            "to multiple AgencyId values."
        )

    accreditors = (
        agencies
        .drop_duplicates(
            subset=[
                "agency_id",
                "agency_name",
            ]
        )
        .sort_values(
            by=[
                "agency_name",
                "agency_id",
            ]
        )
        .reset_index(drop=True)
    )

    print(
        f"Accreditor entities built: "
        f"{len(accreditors):,}"
    )

    return accreditors


def validate_data(
    campuses,
    ipeds,
    accreditors,
    records,
    actions,
):
    print("Validating source data...")

    if ipeds["unitid"].isna().any():
        raise RuntimeError(
            "IPEDS contains a blank UNITID."
        )

    if ipeds["unitid"].duplicated().any():
        raise RuntimeError(
            "IPEDS contains duplicate UNITID values."
        )

    if ipeds["institution_name"].isna().any():
        raise RuntimeError(
            "IPEDS contains a blank institution name."
        )

    if ipeds["control_label"].isna().any():
        raise RuntimeError(
            "IPEDS contains an unexpected CONTROL value."
        )

    if campuses["dapip_id"].isna().any():
        raise RuntimeError(
            "InstituteCampuses contains "
            "a blank DapipId."
        )

    if campuses["dapip_id"].duplicated().any():
        raise RuntimeError(
            "InstituteCampuses contains "
            "duplicate DapipId values."
        )

    campus_ids = set(
        campuses["dapip_id"]
    )

    record_orphans = records.loc[
        ~records["dapip_id"].isin(
            campus_ids
        )
    ]

    action_orphans = actions.loc[
        ~actions["dapip_id"].isin(
            campus_ids
        )
    ]

    if len(record_orphans):
        raise RuntimeError(
            f"Found {len(record_orphans)} "
            "AccreditationRecords orphan rows."
        )

    if len(action_orphans):
        raise RuntimeError(
            f"Found {len(action_orphans)} "
            "AccreditationActions orphan rows."
        )

    if accreditors["agency_id"].isna().any():
        raise RuntimeError(
            "Accreditors contains "
            "a blank AgencyId."
        )

    if accreditors["agency_name"].isna().any():
        raise RuntimeError(
            "Accreditors contains "
            "a blank AgencyName."
        )

    if accreditors[
        "agency_id"
    ].duplicated().any():

        raise RuntimeError(
            "Accreditors contains "
            "duplicate AgencyId values."
        )

    if accreditors[
        "agency_name"
    ].duplicated().any():

        raise RuntimeError(
            "Accreditors contains "
            "duplicate AgencyName values."
        )

    accreditor_ids = set(
        accreditors["agency_id"]
    )

    record_agency_orphans = records.loc[
        ~records["agency_id"].isin(
            accreditor_ids
        )
    ]

    action_agency_orphans = actions.loc[
        ~actions["agency_id"].isin(
            accreditor_ids
        )
    ]

    if len(record_agency_orphans):
        raise RuntimeError(
            f"Found {len(record_agency_orphans)} "
            "AccreditationRecords rows "
            "with unknown AgencyId."
        )

    if len(action_agency_orphans):
        raise RuntimeError(
            f"Found {len(action_agency_orphans)} "
            "AccreditationActions rows "
            "with unknown AgencyId."
        )

    print("Validation passed.")


def copy_dataframe(
    conn,
    table_name,
    df,
):
    columns = list(df.columns)

    column_sql = ", ".join(
        columns
    )

    sql = (
        f"COPY {table_name} "
        f"({column_sql}) "
        f"FROM STDIN"
    )

    print(
        f"Loading {len(df):,} rows "
        f"into {table_name}..."
    )

    with conn.cursor() as cur:

        with cur.copy(sql) as copy:

            for row in df.itertuples(
                index=False,
                name=None,
            ):

                clean_row = tuple(
                    None
                    if (
                        value is None
                        or pd.isna(value)
                        or str(value)
                        .strip()
                        .lower()
                        in {
                            "",
                            "nan",
                            "nat",
                            "<na>",
                        }
                    )
                    else str(value).strip()

                    for value in row
                )

                copy.write_row(
                    clean_row
                )


# ---------------------------------------------------------
# ETL
# ---------------------------------------------------------

def main():
    print()
    print("Consultant Directory ETL")
    print("========================")
    print(f"Workbook: {WORKBOOK}")
    print()

    campuses = load_sheet(
        "InstituteCampuses"
    )

    records = load_sheet(
        "AccreditationRecords"
    )

    actions = load_sheet(
        "AccreditationActions"
    )

    ipeds = load_ipeds()

    campuses = enrich_campuses_with_ipeds_control(
        campuses,
        ipeds,
    )

    accreditors = build_accreditors(
        records,
        actions,
    )

    print()

    print(
        f"InstituteCampuses:     "
        f"{len(campuses):,}"
    )

    print(
        f"IPEDS Institutions:    "
        f"{len(ipeds):,}"
    )

    print(
        f"Accreditors:           "
        f"{len(accreditors):,}"
    )

    print(
        f"AccreditationRecords:  "
        f"{len(records):,}"
    )

    print(
        f"AccreditationActions:  "
        f"{len(actions):,}"
    )

    print()

    validate_data(
        campuses,
        ipeds,
        accreditors,
        records,
        actions,
    )

    print(
        "Connecting to PostgreSQL..."
    )

    with psycopg.connect(
        DATABASE_URL
    ) as conn:

        with conn.cursor() as cur:

            print(
                "Creating PostgreSQL schema..."
            )

            cur.execute(
                SCHEMA_SQL
            )

            print(
                "Clearing previous ETL data..."
            )

            cur.execute(
                """
                TRUNCATE TABLE
                    accreditation_actions,
                    accreditation_records,
                    accreditors,
                    ipeds_institutions,
                    institute_campuses
                RESTART IDENTITY CASCADE;
                """
            )

        copy_dataframe(
            conn,
            "institute_campuses",
            campuses,
        )

        copy_dataframe(
            conn,
            "ipeds_institutions",
            ipeds,
        )

        copy_dataframe(
            conn,
            "accreditors",
            accreditors,
        )

        copy_dataframe(
            conn,
            "accreditation_records",
            records,
        )

        copy_dataframe(
            conn,
            "accreditation_actions",
            actions,
        )

        with conn.cursor() as cur:

            print(
                "Creating accreditor "
                "relationships..."
            )

            cur.execute(
                RELATIONSHIP_SQL
            )

            print(
                "Creating unified "
                "directory view..."
            )

            cur.execute(
                DIRECTORY_VIEW_SQL
            )

            cur.execute(
                """
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM institute_campuses
                    ),
                    (
                        SELECT COUNT(*)
                        FROM ipeds_institutions
                    ),
                    (
                        SELECT COUNT(*)
                        FROM accreditors
                    ),
                    (
                        SELECT COUNT(*)
                        FROM accreditation_records
                    ),
                    (
                        SELECT COUNT(*)
                        FROM accreditation_actions
                    ),
                    (
                        SELECT COUNT(*)
                        FROM directory_organizations
                    );
                """
            )

            (
                campus_count,
                ipeds_count,
                accreditor_count,
                record_count,
                action_count,
                directory_count,
            ) = cur.fetchone()

        if campus_count != len(campuses):
            raise RuntimeError(
                "InstituteCampuses "
                "row-count verification failed."
            )

        if ipeds_count != len(ipeds):
            raise RuntimeError(
                "IPEDS row-count verification failed."
            )

        if accreditor_count != len(accreditors):
            raise RuntimeError(
                "Accreditors "
                "row-count verification failed."
            )

        if record_count != len(records):
            raise RuntimeError(
                "AccreditationRecords "
                "row-count verification failed."
            )

        if action_count != len(actions):
            raise RuntimeError(
                "AccreditationActions "
                "row-count verification failed."
            )

        expected_directory_count = (
            len(campuses)
            + len(accreditors)
        )

        if (
            directory_count
            != expected_directory_count
        ):
            raise RuntimeError(
                "Unified directory "
                "row-count verification failed."
            )

        conn.commit()

    print()
    print("ETL COMPLETE")
    print("============")

    print(
        f"institute_campuses:     "
        f"{campus_count:,}"
    )

    print(
        f"ipeds_institutions:     "
        f"{ipeds_count:,}"
    )

    print(
        f"accreditors:            "
        f"{accreditor_count:,}"
    )

    print(
        f"accreditation_records:  "
        f"{record_count:,}"
    )

    print(
        f"accreditation_actions:  "
        f"{action_count:,}"
    )

    print(
        f"directory_organizations:"
        f"  {directory_count:,}"
    )

    print()
    print(
        "PostgreSQL load verified "
        "successfully."
    )


if __name__ == "__main__":
    main()