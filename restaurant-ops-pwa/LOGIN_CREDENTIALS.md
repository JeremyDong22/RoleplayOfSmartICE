# 登录凭证 / Login Credentials

## 测试账号 / Test Accounts

### 前厅经理 / Manager
- 用户名: manager
- 密码: manager123
- 权限: 可以访问前厅经理和值班经理功能

### 后厨主管 / Chef
- 用户名: chef
- 密码: chef123
- 权限: 只能访问后厨主管功能

### 值班经理 / Duty Manager
- 用户名: dutymanager
- 密码: dutymanager123
- 权限: 只能访问值班经理功能

## 使用说明 / Usage Instructions

1. 访问首页会看到登录界面
2. 输入相应的用户名和密码
3. 登录成功后会跳转到角色选择页面
4. 根据账号权限，只能选择对应的角色进入系统
5. 点击右上角"退出登录"按钮可以退出系统

## 特别说明 / Special Notes

- 前厅经理账号可以访问值班经理功能
- 登录状态保存在 Cookie 中，有效期为 7 天
- 如果尝试访问没有权限的角色，会显示错误提示