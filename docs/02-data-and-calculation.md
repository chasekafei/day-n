# 事件数据与计算规则

## 1. 现有数据资产

原型 `data.js` 当前包含 182 条事件：

- 175 条可作为入坑节点
- 82 条带有成就统计标记
- 角色分布约为：孙颖莎 80 条、王楚钦 57 条、双人 45 条
- 类型包括单打、双打、混双、团体、混团、奖牌、里程碑、名场面、活动、杂志和赛程

这些数据截至 2026-11-04，设计文档中的事件库日期更早。新项目上线前需要建立新的数据冻结版本，不能直接把原型中的所有条目无条件发布。

## 2. 推荐数据结构

`who` 只表示事件涉及谁，不能直接决定统计方式。统计方式应使用单独的 `metrics` 字段。

```ts
type Focus = 'wang-chuqin' | 'sun-yingsha' | 'shatou' | 'custom';

type EventMetric =
  | 'wangSinglesTitle'
  | 'sunSinglesTitle'
  | 'mixedDoublesTitle'
  | 'doublesTitle'
  | 'teamTitle'
  | 'mixedTeamTitle';

type CalendarEvent = {
  id: string;
  date: string;                 // 完整日期使用 YYYY-MM-DD
  datePrecision: 'day' | 'month' | 'year' | 'unknown';
  title: string;
  shortTitle: string;
  type: 'title' | 'medal' | 'milestone' | 'highlight' | 'quote' | 'activity' | 'schedule' | 'incident';
  focus: Focus[];
  metrics: EventMetric[];
  selectable: boolean;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  sourceUrl: string;
  note?: string;
};
```

## 3. 事件筛选

默认热门列表只展示高置信度、完整日期、允许选择的事件。完整列表支持：

- 对象筛选
- 年份筛选
- 事件类型筛选
- 关键词搜索

以下内容不进入默认入坑选择：

- 只有年份或月份、没有完整日期的条目
- 日期待核实的条目
- 伤病、断拍、退赛等“纪事（不做庆祝）”
- 未来尚未发生的赛事节点

待核实事件可以保留在后续时间轴里，但不能作为计算起点。

## 4. 天数计算

日期输入使用纯日历日期，不直接用浏览器两个时间戳相减。默认计算：

```text
days = calendarDayDifference(startDate, targetDate) + 1
```

高级模式：

```text
days = calendarDayDifference(startDate, targetDate)
```

必须覆盖：

- 起始日等于今天
- 跨年
- 闰年
- 未来日期
- 只有年月的近似日期
- 设备时区和北京时间口径

小红书卡片上同时显示“生成于 YYYY-MM-DD”，方便用户判断设备日期是否正确。

## 5. 统计规则

- 王楚钦：只统计 `metrics` 中明确属于王楚钦的项目。
- 孙颖莎：只统计 `metrics` 中明确属于孙颖莎的项目。
- 莎头：默认只统计双方共同参与的混双、混团等项目。
- 自定义：默认只展示总天数和事件数量，除非用户选择了可映射的关注范围。

统计只计算 `startDate <= event.date <= targetDate` 的完整日期事件。卡片写明“按入坑日·第 N 天收录的重大赛事统计”，避免把统计结果表达成完整官方生涯统计。

## 6. 称号和特殊数字

首版可以保留原设计中的天数称号：

- 1–99：发球局新人
- 100–364：相持中
- 365–510：一周年老球迷
- 511–999：511 资深观众
- 1000–1103：千日见证者
- 1104–1999：1104 元老
- 2000–3649：大满贯级老粉
- 3650+：十年球迷
- 5114：5114 传说

这些称号只描述时间长度，不代表真实粉丝等级。

日期探秘功能可以检测：

- 511
- 1104
- 114
- 365
- 1000
- 2000
- 3650
- 5114

命中特殊数字时，使用“日期巧合”或“特殊数字”表达，不直接下结论说两人存在现实关系。

## 7. 存档结构

建议使用独立版本号，例如 `ttcalendar.v1`：

```json
{
  "focus": "shatou",
  "startDate": "2024-07-30",
  "startEventId": "A021",
  "approx": false,
  "dayZero": false,
  "template": "ticket",
  "nickname": "",
  "lastOpen": "2026-11-01"
}
```

字段缺失时补默认值，旧版本读取失败时允许用户重新选择，不把空存档误判成系统故障。
