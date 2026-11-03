-- =====================================================================
-- seed_text.sql : sample resume texts and job descriptions
--
-- Fills the columns added by embeddings_alter.sql for the sample data in
-- seed.sql. Each text matches the skills already given to that student or
-- job. Several job descriptions deliberately use DIFFERENT words from the
-- resumes that fit them (e.g. "backend web services" vs "REST APIs in
-- Node.js"), to show that matching works on meaning, not shared keywords.
--
-- $$ ... $$ is PostgreSQL "dollar quoting": the text inside is taken
-- literally, so apostrophes need no escaping.
--
-- Run after seed.sql:
--   psql -U postgres -d placement_db -f sql/seed_text.sql
-- Then generate the real embeddings:  npm run embed:all
-- =====================================================================


-- ---------------------------------------------------------------------
-- Student resumes
-- ---------------------------------------------------------------------
UPDATE students SET resume_text = $$
Final-year computer science student who enjoys building the server side of web applications.
Built REST APIs in Node.js and Express for a college event-registration portal used by 2,000
students, with PostgreSQL for storage, indexed queries and JWT login. Containerised the services
with Docker for deployment. Interned at a startup where I optimised slow SQL queries and cut API
response times by 40 percent. Strong in data structures and algorithms, with 400+ problems solved
on LeetCode. Comfortable with JavaScript, Git and Linux.
$$ WHERE usn = 'PES2UG23CS001';  -- Aarav Nair

UPDATE students SET resume_text = $$
Computer science undergraduate focused on machine learning. Built a crop-yield prediction model with
scikit-learn and gradient boosting that reached 0.91 R-squared on government agricultural data.
Implemented a convolutional neural network in PyTorch to classify plant leaf diseases from images.
Comfortable cleaning and exploring data with pandas and writing SQL queries to pull training data.
Presented a short paper at a college research symposium. Skilled in Python, feature engineering,
model evaluation and experiment tracking.
$$ WHERE usn = 'PES2UG23CS045';  -- Diya Kulkarni

UPDATE students SET resume_text = $$
AI and ML student passionate about deep learning. Fine-tuned transformer models for sentiment
analysis of product reviews and built an image captioning system that combines a CNN encoder with
an LSTM decoder. Trained models on GPUs, tuned hyperparameters and tracked experiments. Deployed a
small model demo on AWS. Teaching assistant for the neural networks lab. Strong Python skills and
a solid mathematics background in linear algebra and probability.
$$ WHERE usn = 'PES2UG23AM012';  -- Rohan Gupta

UPDATE students SET resume_text = $$
Frontend developer who loves crafting clean, accessible user interfaces. Built a responsive React
and TypeScript dashboard for a campus food-ordering app, with reusable components and state
management. Designed layouts in Figma and turned them into pixel-perfect pages. Led the design team
of the college coding club and regularly present demos to non-technical audiences. Skilled in
JavaScript, HTML, CSS and user experience design.
$$ WHERE usn = 'PES2UG23CS102';  -- Sneha Reddy

UPDATE students SET resume_text = $$
Electronics and communication student specialising in embedded systems. Programmed STM32 and
Arduino microcontrollers in Embedded C to build a smart energy meter that reports usage over Wi-Fi.
Wrote firmware drivers for sensors over I2C and SPI, and debugged hardware with oscilloscopes and
logic analysers. Implemented a real-time task scheduler in C++ for a line-following robot. Basic
Python for test scripts.
$$ WHERE usn = 'PES2UG23EC020';  -- Karthik Iyer

UPDATE students SET resume_text = $$
Information science student with strong Java and database skills. Developed a library management
system in Java with Spring Boot and MySQL, including normalised tables, stored procedures and
reports. Comfortable writing complex SQL joins and aggregations. Completed a summer internship
supporting an enterprise application team, handling bug fixes and client communication. Good grasp
of object-oriented design and data structures.
$$ WHERE usn = 'PES2UG23IS033';  -- Meera Joshi

UPDATE students SET resume_text = $$
Computer science student learning web development. Built a personal portfolio website and a simple
to-do app using JavaScript, HTML and CSS, and started learning React through online courses.
Familiar with basic SQL queries from coursework. Enthusiastic learner looking for an opportunity to
grow as a developer.
$$ WHERE usn = 'PES2UG23CS150';  -- Aditya Singh

UPDATE students SET resume_text = $$
Electrical engineering student who moved into data analysis. Analysed three years of campus
electricity consumption data with Python and pandas, found peak-load patterns and presented
recommendations that cut bills by 12 percent. Built interactive Power BI and Tableau dashboards.
Write SQL to clean and aggregate large datasets. Confident presenter who won the inter-college
business case competition.
$$ WHERE usn = 'PES2UG23EE007';  -- Nisha Patil

UPDATE students SET resume_text = $$
Mechanical engineering student interested in moving into the IT industry. Used basic Python scripts
to automate calculations in a design project and used spreadsheets for data handling. Organised the
annual technical fest as logistics head, coordinating a team of 30 volunteers. Good communication
and teamwork skills, and eager to learn new software tools quickly.
$$ WHERE usn = 'PES2UG23ME015';  -- Vikram Rao

UPDATE students SET resume_text = $$
AI and ML student with research and production experience. Built an end-to-end machine learning
pipeline that predicts student dropout risk, from data cleaning in Python to a model served through
a REST endpoint in a Docker container on AWS. Implemented recommendation algorithms and evaluated
them with offline metrics. Research intern at an IISc lab working on graph neural networks. Strong
in statistics, model deployment and MLOps.
$$ WHERE usn = 'PES2UG23AM040';  -- Ananya Bhat


-- ---------------------------------------------------------------------
-- Job descriptions
-- ---------------------------------------------------------------------
UPDATE job_postings SET description = $$
Join our platform team to design and run the backend web services that power the Nimbus Cloud
customer dashboard. You will develop scalable server-side applications, design relational database
schemas, write efficient queries, and package services in containers for our cloud deployment
pipeline. We value strong problem-solving skills, clean code and an understanding of how data
structures affect performance. Experience with server-side JavaScript runtimes and SQL databases
is essential.
$$ WHERE title = 'Backend Engineer (Node.js)';

UPDATE job_postings SET description = $$
Help Nimbus Cloud customers run their applications smoothly on our cloud platform. You will
troubleshoot virtual machine, storage and networking issues, guide customers over calls and chat,
and write clear knowledge-base articles. Day-to-day work includes reading logs, running basic
database queries and working with containerised workloads. Freshers with an interest in cloud
computing, good communication and a customer-first attitude are welcome; cloud certifications are
a plus.
$$ WHERE title = 'Cloud Support Associate';

UPDATE job_postings SET description = $$
DataVista Analytics is hiring machine learning engineers to build the predictive models behind our
analytics products. You will train, evaluate and improve models for forecasting, classification and
recommendation, experiment with neural networks, and work with data engineers to prepare training
data. You should be fluent in Python and its scientific libraries, understand statistics and model
evaluation, and be able to explain results to product teams.
$$ WHERE title = 'Machine Learning Engineer';

UPDATE job_postings SET description = $$
As a Data Analyst you will turn raw business data into insights. You will write queries to extract
and aggregate data, clean and analyse it with Python, build dashboards and reports for managers, and
present findings in weekly reviews. Attention to detail, curiosity about numbers and the ability to
tell a clear story with data matter more than your branch of engineering.
$$ WHERE title = 'Data Analyst';

UPDATE job_postings SET description = $$
InfraCore Technologies is looking for Systems Engineers to join its enterprise delivery teams after
a structured training programme in Mysuru. You will develop and maintain business applications for
global clients, mostly in Java with relational databases, fix production issues, and coordinate with
client teams. Strong programming fundamentals, logical thinking and good communication are expected;
all engineering branches are eligible.
$$ WHERE title = 'Systems Engineer';

UPDATE job_postings SET description = $$
Work on firmware for industrial IoT devices. You will write low-level software for microcontrollers,
develop drivers for sensors and communication interfaces, optimise code for limited memory and
power, and test it on real hardware in our lab. Knowledge of C and C++, digital electronics, and
debugging tools such as oscilloscopes is essential.
$$ WHERE title = 'Embedded Software Engineer';

UPDATE job_postings SET description = $$
Build the customer-facing web app of FinEdge Payments. You will create fast, accessible and
responsive user interfaces, turn designs into reusable UI components, and connect them to our
payment APIs. Experience with a modern component-based JavaScript framework and typed JavaScript is
required; an eye for design is a strong plus.
$$ WHERE title = 'Frontend Developer (React)';

UPDATE job_postings SET description = $$
FinEdge Payments needs full stack developers who can own a feature from database to browser. You
will build user interfaces with React and TypeScript, write server APIs in Node.js, and design
PostgreSQL tables for our merchant tools. You will work remotely with a small, fast-moving product
team.
$$ WHERE title = 'Full Stack Developer';


-- ---------------------------------------------------------------------
-- Check: every student and job now has text, all within 300 words
-- ---------------------------------------------------------------------
SELECT 'students' AS table_name,
       COUNT(*) FILTER (WHERE resume_text IS NOT NULL) AS with_text,
       COUNT(*)                                        AS total,
       MAX(word_count(resume_text))                    AS longest_words
FROM students
UNION ALL
SELECT 'job_postings',
       COUNT(*) FILTER (WHERE description IS NOT NULL),
       COUNT(*),
       MAX(word_count(description))
FROM job_postings;
