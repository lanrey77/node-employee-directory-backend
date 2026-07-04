const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'employees.json');

function readEmployees()
{
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeEmployees(employees)
{
  fs.writeFileSync(DATA_FILE, JSON.stringify(employees, null, 2));
}

function filterEmployees(employees, query)
{
  let filtered = [...employees];

  if (query.q)
  {
    const searchTerm = query.q.toLowerCase();
    filtered = filtered.filter(emp =>
      emp.firstName.toLowerCase().includes(searchTerm) ||
      emp.lastName.toLowerCase().includes(searchTerm) ||
      emp.email.toLowerCase().includes(searchTerm) ||
      emp.department.toLowerCase().includes(searchTerm) ||
      emp.designation.toLowerCase().includes(searchTerm) ||
      emp.location.toLowerCase().includes(searchTerm)
    );
  }

  if (query.department)
  {
    filtered = filtered.filter(emp => emp.department === query.department);
  }

  if (query.status)
  {
    filtered = filtered.filter(emp => emp.status === query.status);
  }

  if (query.location)
  {
    filtered = filtered.filter(emp => emp.location === query.location);
  }

  if (query.joinDateFrom)
  {
    const fromDate = new Date(query.joinDateFrom);
    filtered = filtered.filter(emp => new Date(emp.joinDate) >= fromDate);
  }

  if (query.joinDateTo)
  {
    const toDate = new Date(query.joinDateTo);
    filtered = filtered.filter(emp => new Date(emp.joinDate) <= toDate);
  }

  if (query.salaryMin)
  {
    const minSalary = parseFloat(query.salaryMin);
    filtered = filtered.filter(emp => emp.salary >= minSalary);
  }

  if (query.salaryMax)
  {
    const maxSalary = parseFloat(query.salaryMax);
    filtered = filtered.filter(emp => emp.salary <= maxSalary);
  }

  return filtered;
}

function sortEmployees(employees, query)
{
  if (!query._sort)
  {
    return employees;
  }

  const sortFields = query._sort.split(',');
  const sortOrders = query._order ? query._order.split(',') : [];

  return [...employees].sort((a, b) =>
  {
    for (let i = 0; i < sortFields.length; i++)
    {
      const field = sortFields[i];
      const order = sortOrders[i] || 'asc';

      let valueA = a[field];
      let valueB = b[field];

      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';

      if (field === 'joinDate')
      {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }

      if (typeof valueA === 'string' && typeof valueB === 'string')
      {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      let comparison = 0;
      if (valueA > valueB) comparison = 1;
      if (valueA < valueB) comparison = -1;

      if (comparison !== 0)
      {
        return order === 'desc' ? -comparison : comparison;
      }
    }

    return 0;
  });
}

function paginateEmployees(employees, query)
{
  const requestedPage = Number.parseInt(query.page ?? query._page, 10);
  const requestedLimit = Number.parseInt(query.limit ?? query.pageSize ?? query._limit, 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 100)
    : 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    data: employees.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems: employees.length,
      totalPages: Math.ceil(employees.length / limit)
    }
  };
}

function listEmployees(query)
{
  let employees = readEmployees();
  employees = filterEmployees(employees, query);
  const totalFiltered = employees.length;
  employees = sortEmployees(employees, query);

  const result = paginateEmployees(employees, query);
  return {
    data: result.data,
    pagination: result.pagination,
    totalFiltered
  };
}

function getEmployeeStats()
{
  const employees = readEmployees();

  const stats = {
    total: employees.length,
    byDepartment: {},
    byStatus: {},
    byLocation: {},
    salaryRange: {
      min: Math.min(...employees.map(e => e.salary)),
      max: Math.max(...employees.map(e => e.salary))
    },
    joinDateRange: {
      earliest: employees.reduce((min, e) => e.joinDate < min ? e.joinDate : min, employees[0]?.joinDate),
      latest: employees.reduce((max, e) => e.joinDate > max ? e.joinDate : max, employees[0]?.joinDate)
    }
  };

  employees.forEach(emp =>
  {
    stats.byDepartment[emp.department] = (stats.byDepartment[emp.department] || 0) + 1;
    stats.byStatus[emp.status] = (stats.byStatus[emp.status] || 0) + 1;
    stats.byLocation[emp.location] = (stats.byLocation[emp.location] || 0) + 1;
  });

  return stats;
}

function exportEmployees(query)
{
  let employees = readEmployees();
  employees = filterEmployees(employees, query);
  employees = sortEmployees(employees, query);
  return employees;
}

function getEmployeeById(id)
{
  const employees = readEmployees();
  return employees.find(emp => emp.id === id);
}

function createEmployee(payload)
{
  const employees = readEmployees();

  const newEmployee = {
    id: Math.max(...employees.map(e => e.id), 0) + 1,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    department: payload.department,
    designation: payload.designation,
    salary: payload.salary,
    joinDate: payload.joinDate || new Date().toISOString().split('T')[0],
    status: payload.status || 'active',
    location: payload.location,
    managerId: payload.managerId || null,
    avatar: payload.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`
  };

  employees.push(newEmployee);
  writeEmployees(employees);
  return newEmployee;
}

function updateEmployee(id, payload)
{
  const employees = readEmployees();
  const index = employees.findIndex(emp => emp.id === id);

  if (index === -1)
  {
    return null;
  }

  const updatedEmployee = {
    ...employees[index],
    ...payload,
    id: id
  };

  employees[index] = updatedEmployee;
  writeEmployees(employees);
  return updatedEmployee;
}

function deleteEmployee(id)
{
  const employees = readEmployees();
  const index = employees.findIndex(emp => emp.id === id);

  if (index === -1)
  {
    return null;
  }

  employees.splice(index, 1);
  writeEmployees(employees);
  return true;
}

function bulkDelete(ids)
{
  let employees = readEmployees();
  const initialCount = employees.length;

  employees = employees.filter(emp => !ids.includes(emp.id));
  writeEmployees(employees);

  return initialCount - employees.length;
}

module.exports = {
  listEmployees,
  getEmployeeStats,
  exportEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkDelete
};
