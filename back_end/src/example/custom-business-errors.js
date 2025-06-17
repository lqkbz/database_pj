/**
 * 自定义业务错误类型示例
 * 演示如何为特定业务场景创建专用的错误类型
 */

const { AppError, ErrorTypes } = require('../middleware/errorhandler');

/**
 * 1. 定义业务特定的错误类型常量
 */
const VehicleErrorTypes = {
  VEHICLE_NOT_OWNED: { code: 'VEHICLE_NOT_OWNED', status: 403 },
  VEHICLE_IN_MAINTENANCE: { code: 'VEHICLE_IN_MAINTENANCE', status: 409 },
  VEHICLE_INSPECTION_OVERDUE: { code: 'VEHICLE_INSPECTION_OVERDUE', status: 400 },
  INVALID_VIN: { code: 'INVALID_VIN', status: 400 },
  MILEAGE_ROLLBACK: { code: 'MILEAGE_ROLLBACK', status: 400 }
};

const WorkOrderErrorTypes = {
  WORK_ORDER_ALREADY_ASSIGNED: { code: 'WORK_ORDER_ALREADY_ASSIGNED', status: 409 },
  WORK_ORDER_COMPLETED: { code: 'WORK_ORDER_COMPLETED', status: 400 },
  MECHANIC_UNAVAILABLE: { code: 'MECHANIC_UNAVAILABLE', status: 409 },
  PARTS_UNAVAILABLE: { code: 'PARTS_UNAVAILABLE', status: 409 },
  INSUFFICIENT_FUNDS: { code: 'INSUFFICIENT_FUNDS', status: 402 }
};

const PaymentErrorTypes = {
  PAYMENT_ALREADY_PROCESSED: { code: 'PAYMENT_ALREADY_PROCESSED', status: 409 },
  PAYMENT_DECLINED: { code: 'PAYMENT_DECLINED', status: 402 },
  INVALID_PAYMENT_METHOD: { code: 'INVALID_PAYMENT_METHOD', status: 400 },
  PAYMENT_TIMEOUT: { code: 'PAYMENT_TIMEOUT', status: 408 }
};

/**
 * 2. 车辆相关的自定义错误类
 */
class VehicleError extends AppError {
  constructor(message, errorType, vehicleId, additionalData = {}) {
    super(message, errorType);
    this.vehicleId = vehicleId;
    this.additionalData = additionalData;
  }
}

// 车辆所有权错误
class VehicleOwnershipError extends VehicleError {
  constructor(vehicleId, currentUserId, ownerId) {
    super(
      '您无权操作该车辆', 
      VehicleErrorTypes.VEHICLE_NOT_OWNED, 
      vehicleId,
      { currentUserId, ownerId }
    );
  }
}

// 车辆正在维修错误
class VehicleInMaintenanceError extends VehicleError {
  constructor(vehicleId, workOrderId, estimatedCompletion) {
    super(
      '车辆正在维修中，无法进行其他操作', 
      VehicleErrorTypes.VEHICLE_IN_MAINTENANCE, 
      vehicleId,
      { workOrderId, estimatedCompletion }
    );
  }
}

// 车辆检验过期错误
class VehicleInspectionOverdueError extends VehicleError {
  constructor(vehicleId, lastInspectionDate, daysOverdue) {
    super(
      `车辆检验已过期${daysOverdue}天，请尽快进行检验`, 
      VehicleErrorTypes.VEHICLE_INSPECTION_OVERDUE, 
      vehicleId,
      { lastInspectionDate, daysOverdue }
    );
  }
}

// VIN码格式错误
class InvalidVinError extends VehicleError {
  constructor(vin, reason) {
    super(
      `VIN码格式错误: ${reason}`, 
      VehicleErrorTypes.INVALID_VIN, 
      null,
      { vin, reason }
    );
  }
}

// 里程数回退错误
class MileageRollbackError extends VehicleError {
  constructor(vehicleId, previousMileage, newMileage) {
    super(
      '里程数不能小于之前记录的数值', 
      VehicleErrorTypes.MILEAGE_ROLLBACK, 
      vehicleId,
      { previousMileage, newMileage, difference: previousMileage - newMileage }
    );
  }
}

/**
 * 3. 工单相关的自定义错误类
 */
class WorkOrderError extends AppError {
  constructor(message, errorType, workOrderId, additionalData = {}) {
    super(message, errorType);
    this.workOrderId = workOrderId;
    this.additionalData = additionalData;
  }
}

// 工单已分配错误
class WorkOrderAlreadyAssignedError extends WorkOrderError {
  constructor(workOrderId, mechanicId, assignedAt) {
    super(
      '工单已被分配给其他技师', 
      WorkOrderErrorTypes.WORK_ORDER_ALREADY_ASSIGNED, 
      workOrderId,
      { mechanicId, assignedAt }
    );
  }
}

// 工单已完成错误
class WorkOrderCompletedError extends WorkOrderError {
  constructor(workOrderId, completedAt) {
    super(
      '工单已完成，无法修改', 
      WorkOrderErrorTypes.WORK_ORDER_COMPLETED, 
      workOrderId,
      { completedAt }
    );
  }
}

// 技师不可用错误
class MechanicUnavailableError extends WorkOrderError {
  constructor(mechanicId, reason, availableFrom) {
    super(
      `技师暂时不可用: ${reason}`, 
      WorkOrderErrorTypes.MECHANIC_UNAVAILABLE, 
      null,
      { mechanicId, reason, availableFrom }
    );
  }
}

// 配件不足错误
class PartsUnavailableError extends WorkOrderError {
  constructor(workOrderId, missingParts) {
    super(
      '所需配件库存不足', 
      WorkOrderErrorTypes.PARTS_UNAVAILABLE, 
      workOrderId,
      { missingParts }
    );
  }
}

/**
 * 4. 支付相关的自定义错误类
 */
class PaymentError extends AppError {
  constructor(message, errorType, paymentId, additionalData = {}) {
    super(message, errorType);
    this.paymentId = paymentId;
    this.additionalData = additionalData;
  }
}

// 支付已处理错误
class PaymentAlreadyProcessedError extends PaymentError {
  constructor(paymentId, processedAt, transactionId) {
    super(
      '该支付已经处理完成', 
      PaymentErrorTypes.PAYMENT_ALREADY_PROCESSED, 
      paymentId,
      { processedAt, transactionId }
    );
  }
}

// 支付被拒错误
class PaymentDeclinedError extends PaymentError {
  constructor(paymentId, declineReason, bankCode) {
    super(
      `支付被拒绝: ${declineReason}`, 
      PaymentErrorTypes.PAYMENT_DECLINED, 
      paymentId,
      { declineReason, bankCode }
    );
  }
}

/**
 * 5. 业务错误工厂函数
 */
const createVehicleError = {
  notOwned: (vehicleId, currentUserId, ownerId) => 
    new VehicleOwnershipError(vehicleId, currentUserId, ownerId),
  
  inMaintenance: (vehicleId, workOrderId, estimatedCompletion) => 
    new VehicleInMaintenanceError(vehicleId, workOrderId, estimatedCompletion),
  
  inspectionOverdue: (vehicleId, lastInspectionDate, daysOverdue) => 
    new VehicleInspectionOverdueError(vehicleId, lastInspectionDate, daysOverdue),
  
  invalidVin: (vin, reason) => 
    new InvalidVinError(vin, reason),
  
  mileageRollback: (vehicleId, previousMileage, newMileage) => 
    new MileageRollbackError(vehicleId, previousMileage, newMileage)
};

const createWorkOrderError = {
  alreadyAssigned: (workOrderId, mechanicId, assignedAt) => 
    new WorkOrderAlreadyAssignedError(workOrderId, mechanicId, assignedAt),
  
  completed: (workOrderId, completedAt) => 
    new WorkOrderCompletedError(workOrderId, completedAt),
  
  mechanicUnavailable: (mechanicId, reason, availableFrom) => 
    new MechanicUnavailableError(mechanicId, reason, availableFrom),
  
  partsUnavailable: (workOrderId, missingParts) => 
    new PartsUnavailableError(workOrderId, missingParts)
};

const createPaymentError = {
  alreadyProcessed: (paymentId, processedAt, transactionId) => 
    new PaymentAlreadyProcessedError(paymentId, processedAt, transactionId),
  
  declined: (paymentId, declineReason, bankCode) => 
    new PaymentDeclinedError(paymentId, declineReason, bankCode)
};

/**
 * 6. 使用示例
 */

// 在车辆服务中使用自定义错误
class VehicleService {
  static async updateMileage(vehicleId, newMileage, userId) {
    // 检查车辆所有权
    const vehicle = await this.getVehicle(vehicleId);
    if (vehicle.ownerId !== userId) {
      throw createVehicleError.notOwned(vehicleId, userId, vehicle.ownerId);
    }
    
    // 检查里程数是否合理
    if (newMileage < vehicle.currentMileage) {
      throw createVehicleError.mileageRollback(
        vehicleId, 
        vehicle.currentMileage, 
        newMileage
      );
    }
    
    // 检查车辆是否在维修
    const activeWorkOrder = await this.getActiveWorkOrder(vehicleId);
    if (activeWorkOrder) {
      throw createVehicleError.inMaintenance(
        vehicleId, 
        activeWorkOrder.id, 
        activeWorkOrder.estimatedCompletion
      );
    }
    
    // 更新里程数
    return await this.updateVehicleMileage(vehicleId, newMileage);
  }
  
  // 模拟方法
  static async getVehicle(id) {
    return { id, ownerId: 'user123', currentMileage: 50000 };
  }
  
  static async getActiveWorkOrder(vehicleId) {
    return null; // 假设没有进行中的工单
  }
  
  static async updateVehicleMileage(vehicleId, mileage) {
    return { vehicleId, mileage, updatedAt: new Date() };
  }
}

// 在工单服务中使用自定义错误
class WorkOrderService {
  static async assignToMechanic(workOrderId, mechanicId) {
    const workOrder = await this.getWorkOrder(workOrderId);
    
    // 检查工单状态
    if (workOrder.status === 'completed') {
      throw createWorkOrderError.completed(workOrderId, workOrder.completedAt);
    }
    
    if (workOrder.mechanicId) {
      throw createWorkOrderError.alreadyAssigned(
        workOrderId, 
        workOrder.mechanicId, 
        workOrder.assignedAt
      );
    }
    
    // 检查技师可用性
    const mechanic = await this.getMechanic(mechanicId);
    if (mechanic.status !== 'available') {
      throw createWorkOrderError.mechanicUnavailable(
        mechanicId, 
        mechanic.unavailableReason, 
        mechanic.availableFrom
      );
    }
    
    // 检查配件可用性
    const requiredParts = await this.getRequiredParts(workOrderId);
    const unavailableParts = await this.checkPartsAvailability(requiredParts);
    if (unavailableParts.length > 0) {
      throw createWorkOrderError.partsUnavailable(workOrderId, unavailableParts);
    }
    
    // 分配工单
    return await this.assignWorkOrder(workOrderId, mechanicId);
  }
  
  // 模拟方法
  static async getWorkOrder(id) {
    return { id, status: 'pending', mechanicId: null };
  }
  
  static async getMechanic(id) {
    return { id, status: 'available' };
  }
  
  static async getRequiredParts(workOrderId) {
    return ['brake_pad', 'oil_filter'];
  }
  
  static async checkPartsAvailability(parts) {
    return []; // 假设所有配件都有库存
  }
  
  static async assignWorkOrder(workOrderId, mechanicId) {
    return { workOrderId, mechanicId, assignedAt: new Date() };
  }
}

/**
 * 7. 错误处理器中对自定义错误的特殊处理
 */
function handleCustomErrors(error, ctx) {
  // 为不同类型的业务错误添加特定的响应头或日志
  if (error instanceof VehicleError) {
    ctx.set('X-Vehicle-Error', 'true');
    if (error.vehicleId) {
      ctx.set('X-Vehicle-Id', error.vehicleId);
    }
  }
  
  if (error instanceof WorkOrderError) {
    ctx.set('X-WorkOrder-Error', 'true');
    if (error.workOrderId) {
      ctx.set('X-WorkOrder-Id', error.workOrderId);
    }
  }
  
  if (error instanceof PaymentError) {
    ctx.set('X-Payment-Error', 'true');
    if (error.paymentId) {
      ctx.set('X-Payment-Id', error.paymentId);
    }
  }
}

module.exports = {
  // 错误类型常量
  VehicleErrorTypes,
  WorkOrderErrorTypes,
  PaymentErrorTypes,
  
  // 错误类
  VehicleError,
  VehicleOwnershipError,
  VehicleInMaintenanceError,
  VehicleInspectionOverdueError,
  InvalidVinError,
  MileageRollbackError,
  
  WorkOrderError,
  WorkOrderAlreadyAssignedError,
  WorkOrderCompletedError,
  MechanicUnavailableError,
  PartsUnavailableError,
  
  PaymentError,
  PaymentAlreadyProcessedError,
  PaymentDeclinedError,
  
  // 工厂函数
  createVehicleError,
  createWorkOrderError,
  createPaymentError,
  
  // 服务示例
  VehicleService,
  WorkOrderService,
  
  // 错误处理器
  handleCustomErrors
}; 