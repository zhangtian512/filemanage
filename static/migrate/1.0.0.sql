CREATE TABLE IF NOT EXISTS fsd.fsd_user (
  username varchar NOT NULL,
  password varchar NOT NULL,
  create_time timestamptz NULL,
  update_time timestamptz NULL,
  CONSTRAINT user_pk PRIMARY KEY (username)
);
CREATE TABLE IF NOT EXISTS fsd.fsd_dir (
  id serial4 NOT NULL,
  "name" varchar NOT NULL,
  parent int4 NOT NULL,
  creator varchar NULL,
  create_time timestamptz NULL,
  update_time timestamptz NULL,
  CONSTRAINT directory_pk PRIMARY KEY (id),
  CONSTRAINT fsd_dir_un UNIQUE ("name",parent)
);
CREATE TABLE IF NOT EXISTS fsd.fsd_file (
  file_id varchar NULL,
  task_id varchar NOT NULL,
  file_name varchar NOT NULL,
  file_type varchar NOT NULL,
  file_size int8 NOT NULL,
  file_path varchar NOT NULL,
  file_dir_id int NOT NULL,
  file_db_key varchar NOT NULL,
  file_info text,
  create_time timestamptz NULL,
  update_time timestamptz NULL,
  CONSTRAINT fsd_file_pk PRIMARY KEY (file_id, file_path, file_dir_id)
);
CREATE TABLE IF NOT EXISTS fsd.fsd_task (
  task_id varchar NOT NULL,
  task_type varchar NOT NULL,
  file_id varchar NULL,
  file_name varchar NOT NULL,
  file_type varchar NOT NULL,
  file_size int8 NOT NULL,
  file_path varchar NOT NULL,
  file_dir_id int NOT NULL,
  file_db_key varchar NOT NULL,
  target_path varchar NULL,
  file_info text,
  progress int NULL,
  create_time timestamptz NULL,
  update_time timestamptz NULL,
  status varchar NULL,
  err_msg varchar NULL,
  CONSTRAINT fsd_task_pk PRIMARY KEY (task_id)
);
CREATE TABLE IF NOT EXISTS fsd.fsd_file_labels (
  id serial4 NOT NULL,
  name varchar NOT NULL,
  type varchar NOT NULL,
  is_default int NOT NULL,
  create_time timestamptz DEFAULT CURRENT_TIMESTAMP,
  update_time timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fsd_file_labels_pk PRIMARY KEY (id),
  CONSTRAINT fsd_file_labels_un UNIQUE ("name")
);
CREATE TABLE IF NOT EXISTS fsd.fsd_download_path (
  username varchar NOT NULL,
  path_type varchar NOT NULL,
  path_value varchar NOT NULL,
  create_time timestamptz NULL,
  update_time timestamptz NULL,
  CONSTRAINT fsd_download_path_pk PRIMARY KEY (username)
);
INSERT INTO fsd.fsd_user (username,password) VALUES ('admin','admin123') ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_dir ("name",parent) VALUES ('/',0) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('采集设备','string',1) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('任务来源','string',1) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('目标类型','string',1) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('场景类型','string',1) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('采集时间','date',1) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('时长(s)','number',1) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('帧率','number',1) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('分辨率','string',1) ON CONFLICT DO NOTHING;
INSERT INTO fsd.fsd_file_labels ("name","type",is_default) VALUES ('谱段','string',1) ON CONFLICT DO NOTHING;
