// Parse and organize workflow tasks from the markdown
export interface WorkflowPeriod {
  id: string
  name: string
  displayName: string
  startTime: string
  endTime: string
  tasks: {
    manager: TaskTemplate[]
    chef: TaskTemplate[]
  }
}

export interface TaskTemplate {
  id: string
  title: string
  description: string
  isNotice?: boolean
  role: 'Manager' | 'Chef'
  department: '前厅' | '后厨'
  requiresPhoto: boolean
  requiresVideo: boolean
  requiresText: boolean
  timeSlot?: string  // Optional, for display purposes
  startTime?: string // Optional, for display purposes
  endTime?: string   // Optional, for display purposes
}

// Define all workflow periods with tasks
export const workflowPeriods: WorkflowPeriod[] = [
  {
    id: 'opening',
    name: 'opening',
    displayName: '开店',
    startTime: '10:00',
    endTime: '10:30',
    tasks: {
      manager: [
        {
          id: 'opening-manager-1',
          title: '开店准备与设备检查',
          description: '更换工作服、佩戴工牌，检查门店设备运转情况并查看能源余额情况（水电气）',
          timeSlot: 'opening',
          startTime: '10:00',
          endTime: '10:10',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'opening-manager-2',
          title: '早会组织',
          description: '召集门店伙伴开展早会，清点到岗人数，总结问题，安排分工',
          timeSlot: 'opening',
          startTime: '10:10',
          endTime: '10:20',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'opening-manager-3',
          title: '员工早餐',
          description: '早餐准备',
          timeSlot: 'opening',
          startTime: '10:20',
          endTime: '10:30',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
      chef: [
        {
          id: 'opening-chef-1',
          title: '厨房开店准备',
          description: '更换工作服、佩戴工牌，检查厨房设备运转情况',
          timeSlot: 'opening',
          startTime: '10:00',
          endTime: '10:10',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'opening-chef-2',
          title: '厨房早会',
          description: '厨师长参与早会，安排厨房分工，对各岗位工作流程进行强调',
          timeSlot: 'opening',
          startTime: '10:10',
          endTime: '10:20',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'opening-chef-3',
          title: '员工早餐',
          description: '早餐准备',
          timeSlot: 'opening',
          startTime: '10:20',
          endTime: '10:30',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
    },
  },
  {
    id: 'lunch-prep',
    name: 'lunch-prep',
    displayName: '餐前准备（午市）',
    startTime: '10:35',
    endTime: '11:25',
    tasks: {
      manager: [
        {
          id: 'lunch-prep-manager-1',
          title: '卫生准备',
          description: '吧台、营业区域、卫生间，清洁间的地面、台面、椅面、垃圾篓清洁',
          timeSlot: 'lunch-prep',
          startTime: '10:35',
          endTime: '11:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-prep-manager-2',
          title: '食品安全检查',
          description: '原材料效期检查，原材料及半成品保存情况检查',
          timeSlot: 'lunch-prep',
          startTime: '10:35',
          endTime: '10:45',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-prep-manager-3',
          title: '物资准备',
          description: '桌面摆台、客用茶水、翻台用餐具、纸巾、餐前水果小吃',
          timeSlot: 'lunch-prep',
          startTime: '10:35',
          endTime: '11:15',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: false,
        },
        {
          id: 'lunch-prep-manager-4',
          title: '开市巡店验收',
          description: '根据检查清单逐一检查确保开市工作准备完毕',
          timeSlot: 'lunch-prep',
          startTime: '11:15',
          endTime: '11:25',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
      chef: [
        {
          id: 'lunch-prep-chef-1',
          title: '收货验货',
          description: '每种原材料上称称重、和送货单核对，误差在±2%以内',
          timeSlot: 'lunch-prep',
          startTime: '10:35',
          endTime: '10:50',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-prep-chef-2',
          title: '食品安全检查',
          description: '原材料效期检查，临期或过期变质的原材料半成品需进行记录并处理',
          timeSlot: 'lunch-prep',
          startTime: '10:35',
          endTime: '10:45',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-prep-chef-3',
          title: '食材准备',
          description: '根据当日预估销售额与桌数进行备货',
          timeSlot: 'lunch-prep',
          startTime: '10:35',
          endTime: '11:30',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-prep-chef-4',
          title: '开市巡店验收',
          description: '根据检查清单逐一检查确保开市工作准备完毕',
          timeSlot: 'lunch-prep',
          startTime: '11:15',
          endTime: '11:25',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
    },
  },
  {
    id: 'lunch-service',
    name: 'lunch-service',
    displayName: '餐中运营（午市）',
    startTime: '11:30',
    endTime: '14:00',
    tasks: {
      manager: [
        {
          id: 'lunch-service-manager-1',
          title: '岗位监督管理',
          description: '确保各岗位在岗位区域内，防止人员脱岗离岗',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-service-manager-2',
          title: '客户满意度巡查',
          description: '定期巡台观察客人用餐满意度，剖菜情况并进行桌访搜集客人意见，预防客诉问题发生',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-service-manager-3',
          title: '人员调度管理',
          description: '根据门店情况临时进行人员调动补位',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-service-manager-4',
          title: '数据维护推广',
          description: '执行日常数据维护工作，如引导评论，引导线上团购',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-service-manager-5',
          title: '高峰期协调管理',
          description: '排队数量超过15桌时，协调现场提高翻台速度（加速出餐、翻台清洁、巡台撤盘等工作）',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
      chef: [
        {
          id: 'lunch-service-chef-1',
          title: '出品质量监控',
          description: '餐中提醒各岗位按标准出品，出品时进行随机检查',
          isNotice: true,
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-service-chef-2',
          title: '厨房运营巡查',
          description: '定期巡厨房查看各岗位工作情况，防止压单、丢单、操作混乱、原料交叉污染等情况',
          isNotice: true,
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-service-chef-3',
          title: '异常情况处理',
          description: '遇异常情况，及时通知人员进行协助解决并与前厅沟通预防出餐慢导致客诉',
          isNotice: true,
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-service-chef-4',
          title: '高峰期备货管理',
          description: '高峰日可提前在无出餐压力的情况下，进行部分原材料备货工作',
          isNotice: true,
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
    },
  },
  {
    id: 'lunch-closing',
    name: 'lunch-closing',
    displayName: '餐后收市（午市）',
    startTime: '14:00',
    endTime: '14:30',
    tasks: {
      manager: [
        {
          id: 'lunch-closing-manager-1',
          title: '午市收市工作',
          description: '遵循先收市再休息原则，安排人员进行卫生清扫，原材料半成品收纳',
          timeSlot: 'lunch-closing',
          startTime: '14:00',
          endTime: '14:30',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-closing-manager-2',
          title: '能源管理',
          description: '关闭非必要电器与能源，减少消耗',
          timeSlot: 'lunch-closing',
          startTime: '14:00',
          endTime: '14:30',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-closing-manager-3',
          title: '员工用餐安排',
          description: '安排午餐与午休',
          timeSlot: 'lunch-closing',
          startTime: '14:00',
          endTime: '14:30',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
      chef: [
        {
          id: 'lunch-closing-chef-1',
          title: '厨房午市收尾',
          description: '遵循先收市再休息原则，安排人员进行卫生清扫，原材料半成品收纳',
          timeSlot: 'lunch-closing',
          startTime: '14:00',
          endTime: '14:30',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-closing-chef-2',
          title: '设备管理',
          description: '关闭非必要电器与能源，减少消耗',
          timeSlot: 'lunch-closing',
          startTime: '14:00',
          endTime: '14:30',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'lunch-closing-chef-3',
          title: '员工用餐安排',
          description: '安排午餐与午休',
          timeSlot: 'lunch-closing',
          startTime: '14:00',
          endTime: '14:30',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
    },
  },
  {
    id: 'dinner-prep',
    name: 'dinner-prep',
    displayName: '餐前准备（晚市）',
    startTime: '16:30',
    endTime: '17:00',
    tasks: {
      manager: [
        {
          id: 'dinner-prep-manager-1',
          title: '卫生准备',
          description: '吧台、营业区域、卫生间，清洁间的地面、台面、椅面清洁',
          timeSlot: 'dinner-prep',
          startTime: '16:30',
          endTime: '16:50',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: false,
        },
        {
          id: 'dinner-prep-manager-2',
          title: '物资准备',
          description: '桌面摆台、客用茶水、翻台用餐具、纸巾',
          timeSlot: 'dinner-prep',
          startTime: '16:30',
          endTime: '16:50',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: false,
        },
        {
          id: 'dinner-prep-manager-3',
          title: '开市验收',
          description: '根据检查清单逐一检查确保晚市准备完毕',
          timeSlot: 'dinner-prep',
          startTime: '16:50',
          endTime: '16:55',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
      chef: [
        {
          id: 'dinner-prep-chef-1',
          title: '收货验货',
          description: '原材料称重核对，检查质量',
          timeSlot: 'dinner-prep',
          startTime: '16:30',
          endTime: '16:50',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-prep-chef-2',
          title: '食材准备',
          description: '根据预估销售额与桌数备货',
          timeSlot: 'dinner-prep',
          startTime: '16:30',
          endTime: '16:50',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-prep-chef-3',
          title: '开市验收',
          description: '检查确保晚市准备完毕',
          timeSlot: 'dinner-prep',
          startTime: '16:50',
          endTime: '16:55',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
    },
  },
  {
    id: 'dinner-service',
    name: 'dinner-service',
    displayName: '餐中运营（晚市）',
    startTime: '17:00',
    endTime: '21:30',
    tasks: {
      manager: [
        {
          id: 'dinner-service-manager-1',
          title: '岗位监督管理',
          description: '确保各岗位在岗位区域内，防止人员脱岗离岗',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-service-manager-2',
          title: '客户满意度巡查',
          description: '定期巡台观察客人用餐满意度，剖菜情况并进行桌访搜集客人意见，预防客诉问题发生',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-service-manager-3',
          title: '人员调度管理',
          description: '根据门店情况临时进行人员调动补位',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-service-manager-4',
          title: '数据维护推广',
          description: '执行日常数据维护工作，如引导评论，引导线上团购',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-service-manager-5',
          title: '高峰期协调管理',
          description: '排队数量超过15桌时，协调现场提高翻台速度（加速出餐、翻台清洁、巡台撤盘等工作）',
          isNotice: true,
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
      chef: [
        {
          id: 'dinner-service-chef-1',
          title: '出品质量监控',
          description: '餐中提醒各岗位按标准出品，出品时进行随机检查',
          isNotice: true,
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-service-chef-2',
          title: '厨房运营巡查',
          description: '定期巡厨房查看各岗位工作情况，防止压单、丢单、操作混乱、原料交叉污染等情况',
          isNotice: true,
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-service-chef-3',
          title: '异常情况处理',
          description: '遇异常情况，及时通知人员进行协助解决并与前厅沟通预防出餐慢导致客诉',
          isNotice: true,
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'dinner-service-chef-4',
          title: '次日备货准备',
          description: '高峰日可提前在无出餐压力的情况下，进行第二天部分原材料备货工作',
          isNotice: true,
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
    },
  },
  {
    id: 'pre-closing',
    name: 'pre-closing',
    displayName: '预打烊（晚市）',
    startTime: '21:30',
    endTime: '22:00',
    tasks: {
      manager: [
        {
          id: 'pre-closing-manager-1',
          title: '收市准备',
          description: '先收市再休息，提前安排人员进行卫生清扫、原材料半成品收纳保存、物资物品收纳等工作',
          isNotice: false,
          timeSlot: 'pre-closing',
          startTime: '21:30',
          endTime: '22:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'pre-closing-manager-2',
          title: '值班安排',
          description: '安排值班人员',
          isNotice: false,
          timeSlot: 'pre-closing',
          startTime: '21:30',
          endTime: '22:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'pre-closing-manager-3',
          title: '用餐安排',
          description: '其他人员陆续进行晚餐就餐',
          isNotice: false,
          timeSlot: 'pre-closing',
          startTime: '21:30',
          endTime: '22:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
      chef: [
        {
          id: 'pre-closing-chef-1',
          title: '收市准备',
          description: '先收市再休息，提前安排人员进行卫生清扫、原材料半成品收纳保存、物资物品收纳等工作',
          isNotice: false,
          timeSlot: 'pre-closing',
          startTime: '21:30',
          endTime: '22:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'pre-closing-chef-2',
          title: '值班安排',
          description: '安排值班人员',
          isNotice: false,
          timeSlot: 'pre-closing',
          startTime: '21:30',
          endTime: '22:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'pre-closing-chef-3',
          title: '用餐安排',
          description: '其他人员陆续进行晚餐就餐',
          isNotice: false,
          timeSlot: 'pre-closing',
          startTime: '21:30',
          endTime: '22:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
      ],
    },
  },
  {
    id: 'closing',
    name: 'closing',
    displayName: '闭店',
    startTime: '22:00',
    endTime: '23:00',
    tasks: {
      manager: [
        {
          id: 'closing-manager-1',
          title: '收据清点保管',
          description: '清点当日收据并存放至指定位置保管',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-manager-2',
          title: '营业数据记录',
          description: '打印交班单并填写日营业报表数据',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-manager-3',
          title: '现金清点保管',
          description: '清点现金保存至指定位置',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-manager-4',
          title: '当日复盘总结',
          description: '门店管理层进行5分钟左右当日问题复盘与总结为第二天晨会做准备',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-manager-5',
          title: '能源安全检查',
          description: '关闭并检查门店水电气能源，确保门店能源安全',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-manager-6',
          title: '安防闭店检查',
          description: '锁好抽屉、门窗进行闭店上报，确保无明火，安防系统开启',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Manager',
          department: '前厅',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
      ],
      chef: [
        {
          id: 'closing-chef-1',
          title: '厨房物资清点',
          description: '清点厨房物资并记录',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-chef-2',
          title: '厨房数据记录',
          description: '记录当日用料情况和备货需求',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-chef-3',
          title: '食材保存检查',
          description: '确保所有食材妥善保存，冷藏设备正常运行',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-chef-4',
          title: '厨房复盘总结',
          description: '总结当日厨房运营情况，记录需改进事项',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: false,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-chef-5',
          title: '厨房能源检查',
          description: '关闭所有炉灶、烤箱等设备，确保无明火',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
        {
          id: 'closing-chef-6',
          title: '厨房安全检查',
          description: '最终检查厨房安全，确保门窗锁好，无安全隐患',
          timeSlot: 'closing',
          startTime: '22:00',
          endTime: '23:00',
          role: 'Chef',
          department: '后厨',
          requiresPhoto: true,
          requiresVideo: false,
          requiresText: true,
        },
      ],
    },
  },
]

// Get current workflow period based on time
export function getCurrentPeriod(testTime?: Date): WorkflowPeriod | null {
  const now = testTime || new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinute

  for (const period of workflowPeriods) {
    const [startHour, startMinute] = period.startTime.split(':').map(Number)
    const [endHour, endMinute] = period.endTime.split(':').map(Number)
    const startInMinutes = startHour * 60 + startMinute
    const endInMinutes = endHour * 60 + endMinute

    if (currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes) {
      return period
    }
  }

  // If no period matches, we're outside business hours
  return null
}

// Get the next upcoming period
export function getNextPeriod(testTime?: Date): WorkflowPeriod | null {
  const now = testTime || new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinute

  for (const period of workflowPeriods) {
    const [startHour, startMinute] = period.startTime.split(':').map(Number)
    const startInMinutes = startHour * 60 + startMinute

    if (currentTimeInMinutes < startInMinutes) {
      return period
    }
  }

  // If we're past all periods, return tomorrow's first period
  return workflowPeriods[0]
}

// Parse markdown content to extract workflow structure
// Commented out as it's not currently used
/*
function parseWorkflowFromMarkdown(content: string): WorkflowPeriod[] {
  const periods: WorkflowPeriod[] = []
  const lines = content.split('\n')
  
  let currentPeriod: WorkflowPeriod | null = null
  let currentDepartment: '前厅' | '后厨' | null = null
  let currentTaskIndex = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Period header (e.g., ## 开店（10:00–10:30）)
    if (line.startsWith('## ') && line.includes('（') && line.includes('）')) {
      if (currentPeriod) {
        periods.push(currentPeriod)
      }
      
      const periodMatch = line.match(/## (.+?)（(\d{1,2}:\d{2})(?:–|-)(\d{1,2}:\d{2})/)
      if (periodMatch) {
        const [, displayName, startTime, endTime] = periodMatch
        const id = displayName
          .replace('餐前准备（午市）', 'lunch-prep')
          .replace('餐前准备（晚市）', 'dinner-prep')
          .replace('餐中运营（午市）', 'lunch-service')
          .replace('餐中运营（晚市）', 'dinner-service')
          .replace('餐后收市（午市）', 'lunch-closing')
          .replace('预打烊（晚市）', 'pre-closing')
          .replace('开店', 'opening')
          .replace('闭店', 'closing')
        
        currentPeriod = {
          id,
          name: id,
          displayName,
          startTime,
          endTime,
          tasks: {
            manager: [],
            chef: []
          }
        }
        currentTaskIndex = 0
      }
    }
    
    // Department header (### 前厅 or ### 后厨)
    else if (line === '### 前厅') {
      currentDepartment = '前厅'
    } else if (line === '### 后厨') {
      currentDepartment = '后厨'
    }
    
    // Task line (numbered list item)
    else if (line.match(/^\d+\.\s/) && currentPeriod && currentDepartment) {
      const isNotice = line.includes('**')
      
      // Extract title and description
      let title = ''
      let description = ''
      
      if (isNotice) {
        // Format: 1. **岗位监督管理**：确保各岗位...
        const noticeMatch = line.match(/^\d+\.\s*\*\*(.+?)\*\*：(.+)/)
        if (noticeMatch) {
          title = noticeMatch[1]
          description = noticeMatch[2]
        }
      } else {
        // Format: 1. 卫生准备：吧台、营业区域...
        const taskMatch = line.match(/^\d+\.\s*(.+?)：(.+)/)
        if (taskMatch) {
          title = taskMatch[1]
          description = taskMatch[2]
        }
      }
      
      if (title && description) {
        const role = currentDepartment === '前厅' ? 'Manager' : 'Chef'
        const task: TaskTemplate = {
          id: `${currentPeriod.id}-${role.toLowerCase()}-${++currentTaskIndex}`,
          title,
          description,
          isNotice,
          role,
          department: currentDepartment,
          requiresPhoto: !isNotice && (
            description.includes('检查') || 
            description.includes('清洁') || 
            description.includes('收据') ||
            description.includes('验收')
          ),
          requiresVideo: false,
          requiresText: true
        }
        
        if (role === 'Manager') {
          currentPeriod.tasks.manager.push(task)
        } else {
          currentPeriod.tasks.chef.push(task)
        }
      }
    }
  }
  
  // Add the last period
  if (currentPeriod) {
    periods.push(currentPeriod)
  }
  
  return periods
}
*/

// Load workflow periods from markdown
export function loadWorkflowPeriods(): WorkflowPeriod[] {
  // Always use hardcoded periods for now as markdown parsing is incomplete
  return workflowPeriods
}

// Get status display for UI
export function getBusinessStatus(testTime?: Date): {
  status: 'closed' | 'opening' | 'operating' | 'closing'
  period: WorkflowPeriod | null
  nextPeriod: WorkflowPeriod | null
  message: string
} {
  const currentPeriod = getCurrentPeriod(testTime)
  const nextPeriod = getNextPeriod(testTime)
  const now = testTime || new Date()
  const currentHour = now.getHours()

  if (!currentPeriod) {
    if (currentHour < 10) {
      return {
        status: 'closed',
        period: null,
        nextPeriod,
        message: '营业前 Pre-Opening'
      }
    } else if (currentHour >= 23) {
      return {
        status: 'closed',
        period: null,
        nextPeriod,
        message: '已打烊 Closed'
      }
    } else if (currentHour >= 14 && currentHour < 16) {
      return {
        status: 'closed',
        period: null,
        nextPeriod,
        message: '午间休息 Afternoon Break'
      }
    }
  }

  if (currentPeriod?.id === 'opening' || currentPeriod?.id === 'closing') {
    return {
      status: currentPeriod.id as 'opening' | 'closing',
      period: currentPeriod,
      nextPeriod,
      message: currentPeriod.displayName
    }
  }

  return {
    status: 'operating',
    period: currentPeriod,
    nextPeriod,
    message: currentPeriod?.displayName || '营业中 Operating'
  }
}