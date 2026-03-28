import { describe, expect, it } from 'vitest'
import {
  buildDeptSavePayload,
  buildRoleMenuPayload,
  buildRolePageParams,
  buildRoleSavePayload,
  buildUserPageParams,
  buildUserSavePayload,
  buildUserStatusPayload,
  createEmptyDeptForm,
  createEmptyRoleForm,
  createEmptyUserForm,
  flattenDeptOptions,
  normalizeDeptForm,
  normalizeRoleForm,
  normalizeUserForm,
  splitMenuPerms
} from '../../src/utils/system-models'

/**
 * 职责：验证系统管理辅助函数的纯数据规则。
 * 为什么存在：用户、角色、部门页面的请求参数和表单归一化都依赖这些函数，回归代价高。
 * 关联链路：用户管理、角色管理、部门管理。
 */

describe('system-models', () => {
  /**
   * 作用：验证部门树会被正确拍平为下拉选项。
   */
  it('should flatten nested department tree into select options', () => {
    const options = flattenDeptOptions([
      {
        id: 1,
        deptName: '市级部门',
        children: [{ id: 2, deptName: '业务处室', children: [] }]
      }
    ])

    expect(options).toEqual([
      { id: 1, label: '市级部门' },
      { id: 2, label: '市级部门 / 业务处室' }
    ])
  })

  /**
   * 作用：验证用户新增与更新 payload 会保持不同语义。
   */
  it('should build create and update user payloads with different semantics', () => {
    const createPayload = buildUserSavePayload(
      {
        ...createEmptyUserForm(9),
        username: '  zhangsan ',
        realName: ' 张三 ',
        phone: ' 13800000000 ',
        roleIds: [1, null, 2]
      },
      9
    )
    const updatePayload = buildUserSavePayload(
      {
        ...createEmptyUserForm(9),
        id: 100,
        realName: ' 李四 ',
        roleIds: [3]
      },
      9
    )

    expect(createPayload.username).toBe('zhangsan')
    expect(createPayload.deptId).toBe(9)
    expect(createPayload.roleIds).toEqual([1, 2])
    expect(updatePayload.id).toBe(100)
    expect(updatePayload.username).toBeUndefined()
  })

  /**
   * 作用：验证用户状态开关会被转换为后端约定的 0/1 状态值。
   */
  it('should build user status payload from enabled flag', () => {
    expect(buildUserStatusPayload(5, true)).toEqual({ id: 5, status: 1 })
    expect(buildUserStatusPayload(5, false)).toEqual({ id: 5, status: 0 })
  })

  /**
   * 作用：验证列表行数据可以被归一化成页面可编辑的表单结构。
   */
  it('should normalize list rows into local editable forms', () => {
    expect(normalizeUserForm({ id: 1, username: 'admin', realName: '管理员', status: 0 })).toMatchObject({
      id: 1,
      username: 'admin',
      realName: '管理员',
      status: 0
    })
    expect(normalizeDeptForm({ id: 2, parentId: null, deptName: '科技局', leaderId: 9 })).toEqual({
      id: 2,
      parentId: 0,
      deptName: '科技局',
      leaderId: 9
    })
    expect(normalizeRoleForm({ id: 3, roleName: '审核员' })).toEqual({
      id: 3,
      roleName: '审核员'
    })
  })

  /**
   * 作用：验证角色和部门保存参数会进行裁剪与空值收口。
   */
  it('should build role and department payloads with trimmed values', () => {
    expect(buildRolePageParams({ roleName: ' 审核员 ' }, { pageNum: 1, pageSize: 10 })).toEqual({
      pageNum: 1,
      pageSize: 10,
      roleName: '审核员'
    })
    expect(buildRoleSavePayload({ ...createEmptyRoleForm(), id: 6, roleName: ' 管理员 ' })).toEqual({
      id: 6,
      roleName: '管理员'
    })
    expect(buildRoleMenuPayload(['dashboard:view', '', null, 'project:manage'])).toEqual({
      menuKeys: ['dashboard:view', 'project:manage']
    })
    expect(buildDeptSavePayload({ ...createEmptyDeptForm(), id: 8, deptName: ' 科技局 ', leaderId: 18 })).toEqual({
      id: 8,
      parentId: 0,
      deptName: '科技局',
      leaderId: 18
    })
  })

  /**
   * 作用：验证用户分页参数和菜单权限拆分逻辑保持稳定。
   */
  it('should build user page params and split menu perms', () => {
    expect(buildUserPageParams({ username: ' admin ', realName: ' 张三 ', status: 1 }, { pageNum: 3, pageSize: 50 })).toEqual({
      pageNum: 3,
      pageSize: 50,
      username: 'admin',
      realName: '张三',
      status: 1
    })
    expect(splitMenuPerms('dashboard:view, project:manage , ,system:user')).toEqual([
      'dashboard:view',
      'project:manage',
      'system:user'
    ])
  })
})
