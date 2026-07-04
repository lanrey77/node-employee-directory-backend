const employeeService = require('../services/employeeService');
const PDFDocument = require('pdfkit');

const EXPORT_COLUMNS = [
  ['Employee ID', 'id'],
  ['First name', 'firstName'],
  ['Last name', 'lastName'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Department', 'department'],
  ['Designation', 'designation'],
  ['Salary', 'salary'],
  ['Join date', 'joinDate'],
  ['Status', 'status'],
  ['Location', 'location'],
  ['Manager ID', 'managerId']
];

function formatSalary(value)
{
  const salary = Number(value);
  return Number.isFinite(salary)
    ? salary.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '';
}

function escapeCsv(value)
{
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function downloadEmployeesCsv(req, res)
{
  try
  {
    const employees = await employeeService.exportEmployees(req.query);
    const rows = [
      ['S/N', ...EXPORT_COLUMNS.map(([heading]) => heading)].map(escapeCsv).join(','),
      ...employees.map((employee, index) =>
        [
          escapeCsv(index + 1),
          ...EXPORT_COLUMNS.map(([, field]) =>
            escapeCsv(field === 'salary' ? formatSalary(employee[field]) : employee[field])
          )
        ].join(',')
      )
    ];

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="employees.csv"'
    });
    return res.send(`\uFEFF${rows.join('\r\n')}`);
  }
  catch (error)
  {
    console.error('Error downloading employee CSV:', error);
    return res.status(500).json({ error: 'Failed to download employee CSV' });
  }
}

async function downloadEmployeesPdf(req, res)
{
  try
  {
    const employees = await employeeService.exportEmployees(req.query);
    const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 32 });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="employees.pdf"'
    });
    document.pipe(res);

    document.fontSize(18).text('Employee Directory');
    document.moveDown(0.25);
    document.fontSize(9).fillColor('#555555')
      .text(`${employees.length} employee${employees.length === 1 ? '' : 's'} - Generated ${new Date().toLocaleString()}`);
    document.moveDown();

    const columns = [
      { label: 'S/N', width: 25, value: (employee, index) => index + 1 },
      { label: 'Employee ID', width: 45, value: employee => employee.id },
      { label: 'Name', width: 95, value: employee => `${employee.firstName} ${employee.lastName}` },
      { label: 'Email', width: 125, value: employee => employee.email },
      { label: 'Department', width: 75, value: employee => employee.department },
      { label: 'Designation', width: 100, value: employee => employee.designation },
      { label: 'Location', width: 75, value: employee => employee.location },
      { label: 'Status', width: 55, value: employee => employee.status },
      { label: 'Join date', width: 65, value: employee => employee.joinDate },
      { label: 'Salary', width: 65, value: employee => formatSalary(employee.salary) }
    ];
    const rowHeight = 24;
    const tableWidth = columns.reduce((total, column) => total + column.width, 0);

    const drawRow = (values, heading = false) =>
    {
      if (document.y + rowHeight > document.page.height - document.page.margins.bottom)
      {
        document.addPage();
      }

      const y = document.y;
      document.rect(document.page.margins.left, y, tableWidth, rowHeight)
        .fill(heading ? '#1f4e78' : '#f4f6f8');
      document.fillColor(heading ? '#ffffff' : '#222222')
        .font(heading ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(7);

      let x = document.page.margins.left;
      columns.forEach((column, index) =>
      {
        document.text(String(values[index] ?? ''), x + 4, y + 7, {
          width: column.width - 8,
          height: rowHeight - 8,
          ellipsis: true,
          lineBreak: false
        });
        x += column.width;
      });
      document.y = y + rowHeight + 1;
    };

    drawRow(columns.map(column => column.label), true);
    employees.forEach((employee, index) =>
    {
      if (document.y + rowHeight > document.page.height - document.page.margins.bottom)
      {
        document.addPage();
        drawRow(columns.map(column => column.label), true);
      }
      drawRow(columns.map(column => column.value(employee, index)));
    });

    document.end();
  }
  catch (error)
  {
    console.error('Error downloading employee PDF:', error);
    if (!res.headersSent)
    {
      return res.status(500).json({ error: 'Failed to download employee PDF' });
    }
    return res.end();
  }
}

async function listEmployees(req, res)
{
  try
  {
    const result = await employeeService.listEmployees(req.query);

    res.set('X-Total-Count', result.totalFiltered.toString());
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');

    if (result.pagination)
    {
      return res.json({
        data: result.data,
        pagination: result.pagination
      });
    }

    return res.json(result.data);
  }
  catch (error)
  {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
}

async function getEmployeeStats(req, res)
{
  try
  {
    const stats = await employeeService.getEmployeeStats();
    return res.json(stats);
  }
  catch (error)
  {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

async function exportEmployees(req, res)
{
  try
  {
    const employees = await employeeService.exportEmployees(req.query);
    return res.json(employees);
  }
  catch (error)
  {
    console.error('Error exporting employees:', error);
    return res.status(500).json({ error: 'Failed to export employees' });
  }
}

async function getEmployeeById(req, res)
{
  try
  {
    const id = parseInt(req.params.id);
    const employee = await employeeService.getEmployeeById(id);

    if (!employee)
    {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(employee);
  }
  catch (error)
  {
    console.error('Error fetching employee:', error);
    return res.status(500).json({ error: 'Failed to fetch employee' });
  }
}

async function createEmployee(req, res)
{
  try
  {
    const newEmployee = await employeeService.createEmployee(req.body);
    return res.status(201).json(newEmployee);
  }
  catch (error)
  {
    console.error('Error creating employee:', error);
    return res.status(500).json({ error: 'Failed to create employee' });
  }
}

async function updateEmployee(req, res)
{
  try
  {
    const id = parseInt(req.params.id);
    const updatedEmployee = await employeeService.updateEmployee(id, req.body);

    if (!updatedEmployee)
    {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(updatedEmployee);
  }
  catch (error)
  {
    console.error('Error updating employee:', error);
    return res.status(500).json({ error: 'Failed to update employee' });
  }
}

async function deleteEmployee(req, res)
{
  try
  {
    const id = parseInt(req.params.id);
    const deleted = await employeeService.deleteEmployee(id);

    if (!deleted)
    {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json({ message: 'Employee deleted successfully' });
  }
  catch (error)
  {
    console.error('Error deleting employee:', error);
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
}

async function bulkDelete(req, res)
{
  try
  {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids))
    {
      return res.status(400).json({ error: 'Invalid request. Expected { ids: [...] }' });
    }

    const deletedCount = await employeeService.bulkDelete(ids);
    return res.json({ message: `${deletedCount} employee(s) deleted successfully` });
  }
  catch (error)
  {
    console.error('Error bulk deleting employees:', error);
    return res.status(500).json({ error: 'Failed to delete employees' });
  }
}

module.exports = {
  listEmployees,
  getEmployeeStats,
  exportEmployees,
  downloadEmployeesCsv,
  downloadEmployeesPdf,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkDelete
};
