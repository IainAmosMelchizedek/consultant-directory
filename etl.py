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

ALTER TABLE institute_campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_actions ENABLE ROW LEVEL SECURITY;
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

    expected = list(COLUMN_MAPS[sheet_name].keys())

    if list(df.columns) != expected:
        raise RuntimeError(
            f"{sheet_name} columns do not match the expected workbook structure."
        )

    df = df.rename(columns=COLUMN_MAPS[sheet_name])

    # Convert blank strings to Python None / SQL NULL.
    df = df.map(
    lambda value: None
    if (
        value is None
        or pd.isna(value)
        or str(value).strip().lower() in {"", "nan", "nat"}
    )
    else str(value).strip()
)

    return df


def validate_data(campuses, records, actions):
    print("Validating source data...")

    if campuses["dapip_id"].isna().any():
        raise RuntimeError("InstituteCampuses contains a blank DapipId.")

    if campuses["dapip_id"].duplicated().any():
        raise RuntimeError("InstituteCampuses contains duplicate DapipId values.")

    campus_ids = set(campuses["dapip_id"])

    record_orphans = records.loc[
        ~records["dapip_id"].isin(campus_ids)
    ]

    action_orphans = actions.loc[
        ~actions["dapip_id"].isin(campus_ids)
    ]

    if len(record_orphans):
        raise RuntimeError(
            f"Found {len(record_orphans)} AccreditationRecords orphan rows."
        )

    if len(action_orphans):
        raise RuntimeError(
            f"Found {len(action_orphans)} AccreditationActions orphan rows."
        )

    print("Validation passed.")


def copy_dataframe(conn, table_name, df):
    columns = list(df.columns)
    column_sql = ", ".join(columns)

    sql = (
        f"COPY {table_name} ({column_sql}) "
        f"FROM STDIN"
    )

    print(f"Loading {len(df):,} rows into {table_name}...")

    with conn.cursor() as cur:
        with cur.copy(sql) as copy:
            for row in df.itertuples(index=False, name=None):
                clean_row = tuple(
                    None
                    if (
                        value is None
                        or pd.isna(value)
                        or str(value).strip().lower() in {"", "nan", "nat", "<na>"}
                    )
                    else str(value).strip()
                    for value in row
                )
                copy.write_row(clean_row)


# ---------------------------------------------------------
# ETL
# ---------------------------------------------------------

def main():
    print()
    print("Consultant Directory ETL")
    print("========================")
    print(f"Workbook: {WORKBOOK}")
    print()

    campuses = load_sheet("InstituteCampuses")
    records = load_sheet("AccreditationRecords")
    actions = load_sheet("AccreditationActions")

    print()
    print(f"InstituteCampuses:     {len(campuses):,}")
    print(f"AccreditationRecords:  {len(records):,}")
    print(f"AccreditationActions:  {len(actions):,}")
    print()

    validate_data(campuses, records, actions)

    print("Connecting to PostgreSQL...")

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            print("Creating PostgreSQL schema...")
            cur.execute(SCHEMA_SQL)

            print("Clearing previous ETL data...")
            cur.execute(
                """
                TRUNCATE TABLE
                    accreditation_actions,
                    accreditation_records,
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
            "accreditation_records",
            records,
        )

        copy_dataframe(
            conn,
            "accreditation_actions",
            actions,
        )

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    (SELECT COUNT(*) FROM institute_campuses),
                    (SELECT COUNT(*) FROM accreditation_records),
                    (SELECT COUNT(*) FROM accreditation_actions);
                """
            )

            campus_count, record_count, action_count = cur.fetchone()

        if campus_count != len(campuses):
            raise RuntimeError("InstituteCampuses row-count verification failed.")

        if record_count != len(records):
            raise RuntimeError("AccreditationRecords row-count verification failed.")

        if action_count != len(actions):
            raise RuntimeError("AccreditationActions row-count verification failed.")

        conn.commit()

    print()
    print("ETL COMPLETE")
    print("============")
    print(f"institute_campuses:     {campus_count:,}")
    print(f"accreditation_records:  {record_count:,}")
    print(f"accreditation_actions:  {action_count:,}")
    print()
    print("PostgreSQL load verified successfully.")


if __name__ == "__main__":
    main()