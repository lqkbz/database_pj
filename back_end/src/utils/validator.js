/**
 * 验证邮箱格式
 * @param {String} email - 待验证的邮箱
 * @returns {Boolean} 是否合法
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证密码强度
 * @param {String} password - 待验证的密码
 * @returns {Boolean} 是否合法
 */
exports.isValidPassword = (password) => {
  // 至少8个字符，包含字母和数字
  return password && password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
};

/**
 * 验证用户名格式
 * @param {String} username - 待验证的用户名
 * @returns {Boolean} 是否合法
 */
exports.isValidUsername = (username) => {
  // 3-20个字符，只允许字母、数字和下划线
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * 验证注册数据
 * @param {Object} data - 注册数据
 * @returns {Object} 验证结果 {isValid, errors}
 */
exports.validateRegistration = (data) => {
  const errors = {};
  
  if (!data.username || !this.isValidUsername(data.username)) {
    errors.username = '用户名必须是3-20个字符，只允许字母、数字和下划线';
  }
  
  if (!data.email || !this.isValidEmail(data.email)) {
    errors.email = '请提供有效的邮箱地址';
  }
  
  if (!data.password || !this.isValidPassword(data.password)) {
    errors.password = '密码至少需要8个字符，且必须包含字母和数字';
  }
  
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * 验证登录数据
 * @param {Object} data - 登录数据
 * @returns {Object} 验证结果 {isValid, errors}
 */
exports.validateLogin = (data) => {
  const errors = {};
  
  if (!data.username && !data.email) {
    errors.login = '请提供用户名或邮箱';
  }
  
  if (!data.password) {
    errors.password = '请提供密码';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}; 