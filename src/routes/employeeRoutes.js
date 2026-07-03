const express = require('express');
const employeeController = require('../controllers/employeeController');

const router = express.Router();

router.get('/stats', employeeController.getEmployeeStats);
router.get('/export', employeeController.exportEmployees);
router.get('/', employeeController.listEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', employeeController.createEmployee);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);
router.delete('/', employeeController.bulkDelete);

module.exports = router;
