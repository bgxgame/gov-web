import { describe, expect, it } from 'vitest'
import {
  buildProjectMapParams,
  buildProjectMapSummaryParams,
  buildProjectPageParams,
  buildProjectSavePayload,
  buildProjectSubmitPayload,
  createEmptyProjectForm,
  normalizeProjectForm
} from '../../src/utils/project-models'

describe('project-models', () => {
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

  it('should include id when building update payload', () => {
    const payload = buildProjectSavePayload({
      ...createEmptyProjectForm(),
      id: '12',
      projectName: '更新项目'
    })

    expect(payload.id).toBe('12')
    expect(payload.projectName).toBe('更新项目')
  })

  it('should build page and map query params with trimmed values', () => {
    expect(
      buildProjectPageParams(
        { projectName: '  项目A ', status: 1, province: ' 陕西 ', city: ' 西安 ', district: ' 雁塔区 ' },
        { pageNum: 2, pageSize: 20 }
      )
    ).toEqual({
      pageNum: 2,
      pageSize: 20,
      projectName: '项目A',
      status: 1,
      province: '陕西',
      city: '西安',
      district: '雁塔区'
    })

    expect(buildProjectMapParams({ province: ' 陕西 ', city: '', district: ' 雁塔区 ' })).toEqual({
      province: '陕西',
      city: undefined,
      district: '雁塔区'
    })

    expect(buildProjectMapSummaryParams(' district ', { province: ' 陕西 ', city: ' 西安市 ', district: '' })).toEqual({
      level: 'district',
      province: '陕西',
      city: '西安市',
      district: undefined
    })
  })

  it('should build minimal submit payload', () => {
    expect(buildProjectSubmitPayload(18)).toEqual({ id: 18 })
  })
})
