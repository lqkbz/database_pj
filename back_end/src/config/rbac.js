/**
 * 基于角色的访问控制配置
 * 定义不同API路径对应的角色访问权限
 */

// 角色定义
const ROLES = {
  CUSTOMER: 'customer',
  MECHANIC: 'mechanic',
  ADMIN: 'admin'
};

// 访问模式定义
const ACCESS = {
  ALL: 'all',       // 所有角色都可访问
  NONE: 'none',     // 禁止访问
  OWN: 'own',       // 只能访问自己的资源
  ASSIGNED: 'assigned', // 只能访问分配给自己的资源
  ROLE: 'role'      // 基于角色的访问
};

// 资源访问规则配置
const resourceAccessRules = [
  // 认证路由 - 所有角色可访问
  { 
    pathPattern: /^\/api\/v1\/auth\/.*/,
    access: {
      [ROLES.CUSTOMER]: ACCESS.ALL,
      [ROLES.MECHANIC]: ACCESS.ALL,
      [ROLES.ADMIN]: ACCESS.ALL
    }
  },
  
  // 用户和车辆路由 - 客户可访问自己的，管理员可访问所有
  { 
    pathPattern: /^\/api\/v1\/users\/.*/,
    access: {
      [ROLES.CUSTOMER]: ACCESS.OWN,
      [ROLES.MECHANIC]: ACCESS.NONE,
      [ROLES.ADMIN]: ACCESS.ALL
    }
  },
  { 
    pathPattern: /^\/api\/v1\/vehicles\/.*/,
    access: {
      [ROLES.CUSTOMER]: ACCESS.OWN,
      [ROLES.MECHANIC]: ACCESS.NONE,
      [ROLES.ADMIN]: ACCESS.ALL
    }
  },
  
  // 技师路由 - 技师可访问自己的，管理员可访问所有
  { 
    pathPattern: /^\/api\/v1\/mechanics\/me\/.*/,
    access: {
      [ROLES.CUSTOMER]: ACCESS.NONE,
      [ROLES.MECHANIC]: ACCESS.OWN,
      [ROLES.ADMIN]: ACCESS.ALL
    }
  },
  
  // 工单路由 - 客户可访问自己的，技师可访问分配给自己的，管理员可访问所有
  { 
    pathPattern: /^\/api\/v1\/work-orders\/.*/,
    access: {
      [ROLES.CUSTOMER]: ACCESS.OWN,
      [ROLES.MECHANIC]: ACCESS.ASSIGNED,
      [ROLES.ADMIN]: ACCESS.ALL
    }
  },
  
  // 管理员路由 - 只有管理员可访问
  { 
    pathPattern: /^\/api\/v1\/admin\/.*/,
    access: {
      [ROLES.CUSTOMER]: ACCESS.NONE,
      [ROLES.MECHANIC]: ACCESS.NONE,
      [ROLES.ADMIN]: ACCESS.ALL
    }
  },
  
  // 系统和公共路由 - 所有角色可访问
  { 
    pathPattern: /^\/api\/v1\/(healthz|openapi\.json|docs|static\/).*/,
    access: {
      [ROLES.CUSTOMER]: ACCESS.ALL,
      [ROLES.MECHANIC]: ACCESS.ALL,
      [ROLES.ADMIN]: ACCESS.ALL
    }
  }
];

module.exports = {
  ROLES,
  ACCESS,
  resourceAccessRules
}; 