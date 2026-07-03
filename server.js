const express = require('express');
const cors = require('cors');
const employeeRoutes = require('./src/routes/employeeRoutes');

const app = express();
const PORT = 3000;

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

// Start server
app.listen(PORT, () =>
{
  console.log(`Employee Directory API running at http://localhost:${PORT}/api`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET    /api/employees          - List employees (with filter, sort, pagination)');
  console.log('  GET    /api/employees/stats    - Get statistics');
  console.log('  GET    /api/employees/export   - Export filtered employees');
  console.log('  GET    /api/employees/:id      - Get single employee');
  console.log('  POST   /api/employees          - Create employee');
  console.log('  PUT    /api/employees/:id      - Update employee');
  console.log('  DELETE /api/employees/:id      - Delete employee');
  console.log('  DELETE /api/employees          - Bulk delete { ids: [...] }');
  console.log('  GET    /departments        - List departments');
  console.log('  GET    /locations          - List locations');
  console.log('  GET    /designations       - List designations');
  console.log('');
  console.log('Query parameters for /employees:');
  console.log('  ?q=search          - Full-text search');
  console.log('  ?department=X      - Filter by department');
  console.log('  ?status=X          - Filter by status (active, on-leave, terminated)');
  console.log('  ?location=X        - Filter by location');
  console.log('  ?joinDateFrom=X    - Filter by join date (from)');
  console.log('  ?joinDateTo=X      - Filter by join date (to)');
  console.log('  ?salaryMin=X       - Filter by salary (min)');
  console.log('  ?salaryMax=X       - Filter by salary (max)');
  console.log('  ?_sort=field       - Sort by field (comma-separated for multi-sort)');
  console.log('  ?_order=asc|desc   - Sort order (comma-separated for multi-sort)');
  console.log('  ?_page=1&_limit=10 - Pagination');
});