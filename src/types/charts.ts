export interface SavedChartPayload {
  name: string
  gender: '男' | '女'
  calendar: 'lunar' | 'solar'
  date: string
  timeIndex: number
  isLeap: boolean
  initialChartType: 'natal' | 'yearly'
  yearlyYear: number
  bazi: string
}

export interface SavedChartSummary {
  id: number
  subjectName: string
  gender: '男' | '女'
  phone: string
  birthDateTime: string
  payload: SavedChartPayload
  createdAt: string
  updatedAt: string
}

export interface SavedChartDetail extends SavedChartSummary {
  payload: SavedChartPayload
}

export interface SavedChartsResponse {
  charts: SavedChartSummary[]
}

export interface SavedChartResponse {
  chart: SavedChartDetail
}

export interface AdminUserChartsResponse {
  user: {
    id: number
    name: string
    email: string
  }
  charts: SavedChartSummary[]
}

export interface AdminUserBirthChartResponse {
  chart: {
    subjectName: string
    gender: '男' | '女'
    birthDateTime: string
    payload: SavedChartPayload
    source: 'registration'
  }
}
