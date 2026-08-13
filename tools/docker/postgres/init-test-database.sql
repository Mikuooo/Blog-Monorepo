SELECT 'CREATE DATABASE blog_test OWNER blog'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'blog_test')\gexec
