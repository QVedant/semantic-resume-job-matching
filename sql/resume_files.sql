-- =====================================================================
-- resume_files.sql : uploaded resume PDFs, stored inside PostgreSQL
--
-- One row per student (their latest upload). The file itself is a BYTEA
-- (binary) column, so it lives in the same database as everything else:
--   - saved in the same transaction as students.resume_url
--   - included in every database backup
--   - downloads go through the app's API, which checks who may see it
-- The database itself guarantees it is a PDF and at most 2 MB.
--
-- Safe to re-run. Run after schema.sql (before or after seed.sql):
--   psql -U postgres -d placement_db -f sql/resume_files.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS resume_files (
    student_id  INT          PRIMARY KEY,           -- one file per student
    file_name   VARCHAR(255) NOT NULL,
    mime_type   VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    size_bytes  INT          NOT NULL,
    content     BYTEA        NOT NULL,              -- the PDF itself
    uploaded_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resume_file_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,
    -- Only PDFs, at most 2 MB (2 * 1024 * 1024 bytes).
    CONSTRAINT chk_resume_file_type
        CHECK (mime_type = 'application/pdf'),
    CONSTRAINT chk_resume_file_size
        CHECK (size_bytes > 0 AND size_bytes <= 2097152),
    -- size_bytes must describe the stored content truthfully.
    CONSTRAINT chk_resume_file_size_matches
        CHECK (octet_length(content) = size_bytes),
    -- Every real PDF starts with the 5 bytes "%PDF-" (hex 25 50 44 46 2D).
    -- This rejects files that are only *named* .pdf.
    CONSTRAINT chk_resume_file_signature
        CHECK (substring(content FROM 1 FOR 5) = '\x255044462d'::bytea)
);
