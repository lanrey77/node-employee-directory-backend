const express = require('express');
const cors = require('cors');
const employeeRoutes = require('./src/routes/employeeRoutes');
const database = require('./src/database');

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/employees', employeeRoutes);

// GET /departments - List all departments
app.get('/departments', (req, res) =>
{
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
  res.json(departments);
});

// GET /locations - List all locations
app.get('/locations', (req, res) =>
{
  const locations = ['New York', 'San Francisco', 'London', 'Bangalore', 'Singapore'];
  res.json(locations);
});

// GET /designations - List all designations
app.get('/designations', (req, res) =>
{
  const designations = [
    'Software Engineer',
    'Senior Software Engineer',
    'Tech Lead',
    'Engineering Manager',
    'Product Manager',
    'Designer',
    'Senior Designer',
    'Marketing Specialist',
    'Marketing Manager',
    'Sales Representative',
    'Sales Manager',
    'HR Specialist',
    'HR Manager',
    'Accountant',
    'Finance Manager',
    'Operations Analyst',
    'Operations Manager'
  ];
  res.json(designations);
});

// Start the HTTP server only after PostgreSQL is ready.
database.ready.then(() =>
{
  app.listen(PORT, () =>
  {
    console.log(`Employee Directory API running at http://localhost:${PORT}/api`);
    console.log(`PostgreSQL database: ${process.env.DB_NAME || 'employee_directory'}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET    /api/employees            - List employees (filter, sort, pagination)');
    console.log('  GET    /api/employees/stats      - Get statistics');
    console.log('  GET    /api/employees/export     - Export filtered employees as JSON');
    console.log('  GET    /api/employees/export/csv - Download filtered employees as CSV');
    console.log('  GET    /api/employees/export/pdf - Download filtered employees as PDF');
    console.log('  GET    /api/employees/:id        - Get single employee');
    console.log('  POST   /api/employees            - Create employee');
    console.log('  PUT    /api/employees/:id        - Update employee');
    console.log('  DELETE /api/employees/:id        - Delete employee');
    console.log('  DELETE /api/employees            - Bulk delete { ids: [...] }');
    console.log('  GET    /departments              - List departments');
    console.log('  GET    /locations                - List locations');
    console.log('  GET    /designations             - List designations');
    console.log('');
    console.log('Query parameters for /api/employees:');
    console.log('  ?q=search          - Full-text search');
    console.log('  ?department=X      - Filter by department');
    console.log('  ?status=X          - Filter by status');
    console.log('  ?location=X        - Filter by location');
    console.log('  ?joinDateFrom=X    - Filter by join date (from)');
    console.log('  ?joinDateTo=X      - Filter by join date (to)');
    console.log('  ?salaryMin=X       - Filter by minimum salary');
    console.log('  ?salaryMax=X       - Filter by maximum salary');
    console.log('  ?_sort=field       - Sort fields (comma-separated)');
    console.log('  ?_order=asc|desc   - Sort orders (comma-separated)');
    console.log('  ?page=1&limit=10   - Pagination (legacy: _page/_limit)');
  });
}).catch(error =>
{
  console.error('Failed to initialize PostgreSQL:', error.message);
  process.exitCode = 1;
});
