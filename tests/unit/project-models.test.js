import { describe, expect, it } from 'vitest'
import {
  buildProjectMapParams,
  buildProjectPageParams,
  buildProjectSavePayload,
  buildProjectSubmitPayload,
  createEmptyProjectForm,
  normalizeProjectForm
} from '../../src/utils/project-models'

/**
 * 职责：验证项目轻量模型辅助函数的纯数据语义。
 * 为什么存在：项目管理页大量依赖这些辅助函数来组织查询参数、保存 payload 和详情回填。
 * 关联链路：项目分页、新增编辑、详情回填、地图筛选、提交审批。
 */

describe('project-models', () => {
  /**
   * 作用：验证默认空表单结构稳定，避免页面初始化字段漂移。
   */
  it('should create an empty project form with stable defaults', () => {
    expect(createEmptyProjectForm()).toEqual({
      id: undefined,
      projectName: '',
      projectCode: '',
      address: '',
      province: '',
      city: '',
      district: '',
      longitude: '',
      latitude: '',
      leaderUserId: undefined,
      leaderName: '',
      leaderPhone: '',
      description: '',
      status: 0,
      creatorDeptId: undefined
    })
  })

  /**
   * 作用：验证详情数据可以被归一化成页面可编辑的表单结构。
   */
  it('should normalize detail data back into editable form shape', () => {
    const form = normalizeProjectForm(
      {
        id: 9,
        projectName: '河道治理项目',
        leaderName: '李工',
        leaderPhone: '13800000000',
        longitude: 108.95,
        status: 3
      },
      [{ id: 3, realName: '李工', phone: '13800000000' }]
    )

    expect(form.id).toBe('9')
    expect(form.leaderUserId).toBe(3)
    expect(form.longitude).toBe(108.95)
    expect(form.status).toBe(3)
  })

  /**
   * 作用：验证新增 payload 会去掉无意义空值，并完成数字与空字符串归一化。
   */
  it('should build create payload without meaningless blank fields', () => {
    const payload = buildProjectSavePayload({
      ...createEmptyProjectForm(),
      projectName: '  河道治理项目  ',
      projectCode: '  PJ-001 ',
      province: ' 陕西省 ',
      longitude: '108.95',
      latitude: '',
      description: '  '
    })

    expect(payload).toEqual({
      projectName: '河道治理项目',
      projectCode: 'PJ-001',
      address: undefined,
      province: '陕西省',
      city: undefined,
      district: undefined,
      longitude: 108.95,
      latitude: null,
      leaderUserId: undefined,
      leaderName: undefined,
      leaderPhone: undefined,
      description: undefined,
      status: 0,
      creatorDeptId: undefined
    })
  })

  /**
   * 作用：验证更新 payload 会保留 id，确保后端能够识别更新语义。
   */
  it('should include id when building update payload', () => {
    const payload = buildProjectSavePayload({
      ...createEmptyProjectForm(),
      id: '12',
      projectName: '更新项目'
    })

    expect(payload.id).toBe('12')
    expect(payload.projectName).toBe('更新项目')
  })

  /**
   * 作用：验证分页和地图筛选参数都会进行裁剪和空值处理。
   */
  it('should build page and map query params with trimmed values', () => {
    expect(buildProjectPageParams({ projectName: '  项目A ', status: 1, province: ' 陕西 ' }, { pageNum: 2, pageSize: 20 })).toEqual({
      pageNum: 2,
      pageSize: 20,
      projectName: '项目A',
      status: 1,
      province: '陕西'
    })

    expect(buildProjectMapParams({ province: ' 陕西 ', city: '', district: ' 雁塔区 ' })).toEqual({
      province: '陕西',
      city: undefined,
      district: '雁塔区'
    })
  })

  /**
   * 作用：验证提交审批请求只保留最小必要字段。
   */
  it('should build minimal submit payload', () => {
    expect(buildProjectSubmitPayload(18)).toEqual({ id: 18 })
  })
})
