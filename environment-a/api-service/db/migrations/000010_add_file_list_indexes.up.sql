CREATE INDEX IF NOT EXISTS idx_files_user_directory_created_committed
    ON files (id_pengguna, id_direktori, dibuat_pada DESC, id_berkas DESC)
    WHERE status_penyimpanan = 'committed' AND dihapus_pada IS NULL;

CREATE INDEX IF NOT EXISTS idx_files_user_directory_name_committed
    ON files (id_pengguna, id_direktori, lower(nama), id_berkas)
    WHERE status_penyimpanan = 'committed' AND dihapus_pada IS NULL;

CREATE INDEX IF NOT EXISTS idx_files_user_directory_starred_committed
    ON files (id_pengguna, id_direktori, dibintangi_pada DESC, dibuat_pada DESC, id_berkas DESC)
    WHERE status_penyimpanan = 'committed' AND dihapus_pada IS NULL AND dibintangi_pada IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_user_trash_created
    ON files (id_pengguna, dihapus_pada DESC, lower(nama), id_berkas)
    WHERE status_penyimpanan = 'committed' AND dihapus_pada IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_user_starred_created
    ON files (id_pengguna, dibintangi_pada DESC, lower(nama), id_berkas)
    WHERE status_penyimpanan = 'committed' AND dihapus_pada IS NULL AND dibintangi_pada IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_directories_user_trash_created
    ON directories (id_pengguna, dihapus_pada DESC, lower(nama), id_direktori)
    WHERE dihapus_pada IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_directories_user_starred_created
    ON directories (id_pengguna, dibintang_pada DESC, lower(nama), id_direktori)
    WHERE dihapus_pada IS NULL AND dibintang_pada IS NOT NULL;
