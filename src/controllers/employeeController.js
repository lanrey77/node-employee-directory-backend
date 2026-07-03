const employeeService = require('../services/employeeService');

function listEmployees(req, res)
{
  try
  {
    const result = employeeService.listEmployees(req.query);

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

function getEmployeeStats(req, res)
{
  try
  {
    const stats = employeeService.getEmployeeStats();
    return res.json(stats);
  }
  catch (error)
  {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

function exportEmployees(req, res)
{
  try
  {
    const employees = employeeService.exportEmployees(req.query);
    return res.json(employees);
  }
  catch (error)
  {
    console.error('Error exporting employees:', error);
    return res.status(500).json({ error: 'Failed to export employees' });
  }
}

function getEmployeeById(req, res)
{
  try
  {
    const id = parseInt(req.params.id);
    const employee = employeeService.getEmployeeById(id);

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

function createEmployee(req, res)
{
  try
  {
    const newEmployee = employeeService.createEmployee(req.body);
    return res.status(201).json(newEmployee);
  }
  catch (error)
  {
    console.error('Error creating employee:', error);
    return res.status(500).json({ error: 'Failed to create employee' });
  }
}

function updateEmployee(req, res)
{
  try
  {
    const id = parseInt(req.params.id);
    const updatedEmployee = employeeService.updateEmployee(id, req.body);

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

function deleteEmployee(req, res)
{
  try
  {
    const id = parseInt(req.params.id);
    const deleted = employeeService.deleteEmployee(id);

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

function bulkDelete(req, res)
{
  try
  {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids))
    {
      return res.status(400).json({ error: 'Invalid request. Expected { ids: [...] }' });
    }

    const deletedCount = employeeService.bulkDelete(ids);
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
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkDelete
};
