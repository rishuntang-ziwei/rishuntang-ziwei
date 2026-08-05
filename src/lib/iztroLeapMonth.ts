import { EARTHLY_BRANCHES } from 'iztro/lib/data/constants.js'
import * as iztroUtils from 'iztro/lib/utils/index.js'
import { solar2lunar } from 'lunar-lite/lib/convertor'

let applied = false

/**
 * 閏月以下月論：整個閏月視為下一個月排盤（不再採前半月同月、後半月下月）。
 * 國曆輸入會由 solar2lunar 自動判斷是否閏月；農曆輸入需勾選閏月。
 */
export function applyLeapMonthAsNextMonthRule(): void {
  if (applied) return
  applied = true

  const patched = (solarDateStr: string, timeIndex: number, fixLeap?: boolean) => {
    const { lunarMonth, isLeap } = solar2lunar(solarDateStr)
    const firstIndex = EARTHLY_BRANCHES.indexOf('yinEarthly')
    const needToAdd = Boolean(isLeap && fixLeap && timeIndex !== 12)
    return iztroUtils.fixIndex(lunarMonth + 1 - firstIndex + (needToAdd ? 1 : 0))
  }

  ;(iztroUtils as { fixLunarMonthIndex: typeof patched }).fixLunarMonthIndex = patched
}

applyLeapMonthAsNextMonthRule()
