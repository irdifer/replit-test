import { google, sheets_v4 } from 'googleapis';
import { db } from '../db';
import { activities, rescues } from '@shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// Google Sheets API 設定
// 您需要在此處添加您的 Google Sheets API 憑證
// 請參考 Google Cloud Console 來創建服務帳號和獲取憑證
// https://console.cloud.google.com/apis/credentials

/**
 * Google Sheets API 設定
 * 當您有憑證時，請填入以下資訊：
 */
const GOOGLE_SHEETS_CONFIG = {
  // 您的 Google Sheet ID (從 Google Sheets URL 中獲取)
  // 例如：https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
  SHEET_ID: process.env.GOOGLE_SHEET_ID || '',
  
  // 用於救護紀錄的工作表名稱
  RESCUE_SHEET_NAME: '救護紀錄',
  
  // 用於協勤時數紀錄的工作表名稱
  ACTIVITY_SHEET_NAME: '協勤時數',
  
  // 自動同步頻率 (毫秒) - 預設為每天同步一次
  SYNC_INTERVAL: 24 * 60 * 60 * 1000, // 24小時
};

/**
 * Google 認證設定
 * 您需要提供服務帳號金鑰的 JSON 內容
 */
async function getAuthClient() {
  try {
    // 這裡需要您的服務帳號憑證
    // 您可以將憑證存在環境變數中
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      console.error('缺少 Google 服務帳號憑證');
      return null;
    }
    
    // 從環境變數解析服務帳號金鑰
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    return auth;
  } catch (error) {
    console.error('Google 認證失敗:', error);
    return null;
  }
}

/**
 * 將救護紀錄同步到 Google Sheets
 */
export async function syncRescuesToSheet() {
  try {
    // 獲取認證
    const auth = await getAuthClient();
    if (!auth) return { success: false, error: '認證失敗' };
    
    // 初始化 Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 檢查 Sheet ID 是否有效
    if (!GOOGLE_SHEETS_CONFIG.SHEET_ID) {
      return { success: false, error: '缺少 Google Sheet ID' };
    }
    
    // 從資料庫中獲取救護紀錄
    const rescueRecords = await fetchRescueRecordsForSync();
    
    // 準備表頭
    const headers = [
      '姓名', '時間', '項目(案件類型)', '子項目(案件子類型)', '敘述(基本處置)', '送達醫院'
    ];
    
    // 將數據轉換為表格格式
    const rows = [
      headers,
      ...rescueRecords.map(record => [
        record.name,
        record.time,
        record.caseType,
        record.caseSubtype || '',
        record.treatment || '',
        record.hospital || '',
      ])
    ];
    
    // 寫入 Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
      range: `${GOOGLE_SHEETS_CONFIG.RESCUE_SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });
    
    return { success: true, count: rescueRecords.length };
  } catch (error) {
    console.error('同步救護紀錄到 Google Sheets 失敗:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 將協勤時數同步到 Google Sheets
 */
export async function syncActivitiesToSheet() {
  try {
    // 獲取認證
    const auth = await getAuthClient();
    if (!auth) return { success: false, error: '認證失敗' };
    
    // 初始化 Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 檢查 Sheet ID 是否有效
    if (!GOOGLE_SHEETS_CONFIG.SHEET_ID) {
      return { success: false, error: '缺少 Google Sheet ID' };
    }
    
    // 從資料庫中獲取協勤時數紀錄
    const activityRecords = await fetchActivityRecordsForSync();
    
    // 準備表頭
    const headers = [
      '姓名', '協勤日期', '協勤(簽到時間)', '退勤(簽退時間)', '時數'
    ];
    
    // 將數據轉換為表格格式
    const rows = [
      headers,
      ...activityRecords.map(record => [
        record.name,
        record.date,
        record.signInTime || '',
        record.signOutTime || '',
        record.duration.toString(),
      ])
    ];
    
    // 寫入 Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
      range: `${GOOGLE_SHEETS_CONFIG.ACTIVITY_SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });
    
    return { success: true, count: activityRecords.length };
  } catch (error) {
    console.error('同步協勤時數到 Google Sheets 失敗:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 從資料庫獲取救護紀錄
 */
async function fetchRescueRecordsForSync() {
  // 獲取所有的救護紀錄並包含用戶名稱
  const result = await db.query.rescues.findMany({
    with: {
      user: true,
    },
    orderBy: [desc(rescues.timestamp)],
  });
  
  // 轉換為所需格式
  return result.map(record => ({
    name: record.user.name,
    time: formatInTimeZone(new Date(record.timestamp), 'Asia/Taipei', 'yyyy-MM-dd HH:mm'),
    caseType: record.caseType,
    caseSubtype: record.caseSubtype,
    treatment: record.treatment,
    hospital: record.hospital,
  }));
}

/**
 * 從資料庫獲取協勤時數紀錄
 */
async function fetchActivityRecordsForSync() {
  // 獲取所有使用者
  const users = await db.query.users.findMany();
  
  // 收集所有使用者的協勤時數紀錄
  const results = [];
  
  for (const user of users) {
    // 獲取該使用者的月度活動記錄
    const monthlyActivities = await fetchUserMonthlyActivities(user.id);
    
    // 添加到結果中
    results.push(...monthlyActivities.map(activity => ({
      name: user.name,
      ...activity,
    })));
  }
  
  return results;
}

/**
 * 獲取使用者的月度活動記錄
 */
async function fetchUserMonthlyActivities(userId: number) {
  // 獲取本月的開始和結束日期
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // 獲取本月的所有活動
  const monthActivities = await db.select()
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        gte(activities.timestamp, monthStart),
        lte(activities.timestamp, monthEnd)
      )
    );
  
  // 按日期分組整理活動
  const dailyActivities = new Map<string, { signIn?: Date, signOut?: Date }>();
  
  for (const activity of monthActivities) {
    const date = formatInTimeZone(new Date(activity.timestamp), 'Asia/Taipei', 'yyyy-MM-dd');
    const entry = dailyActivities.get(date) || {};
    
    if (activity.type === 'signin') {
      entry.signIn = new Date(activity.timestamp);
    } else if (activity.type === 'signout') {
      entry.signOut = new Date(activity.timestamp);
    }
    
    dailyActivities.set(date, entry);
  }
  
  // 計算每日的工作時數
  const result = [];
  
  for (const [date, entry] of dailyActivities.entries()) {
    // 只處理有簽到的日期
    if (entry.signIn) {
      const signInTime = formatInTimeZone(entry.signIn, 'Asia/Taipei', 'HH:mm');
      const signOutTime = entry.signOut ? formatInTimeZone(entry.signOut, 'Asia/Taipei', 'HH:mm') : null;
      
      // 計算工作時數
      let duration = 0;
      if (entry.signIn && entry.signOut) {
        duration = (entry.signOut.getTime() - entry.signIn.getTime()) / (1000 * 60 * 60);
        // 四捨五入到一位小數
        duration = Math.round(duration * 10) / 10;
      }
      
      result.push({
        date,
        signInTime,
        signOutTime,
        duration,
      });
    }
  }
  
  return result;
}

/**
 * 初始化 Google Sheets 設置
 * 檢查並創建必要的工作表
 */
export async function initializeGoogleSheets() {
  try {
    // 獲取認證
    const auth = await getAuthClient();
    if (!auth) return { success: false, error: '認證失敗' };
    
    // 初始化 Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 檢查 Sheet ID 是否有效
    if (!GOOGLE_SHEETS_CONFIG.SHEET_ID) {
      return { success: false, error: '缺少 Google Sheet ID' };
    }
    
    // 獲取現有工作表
    const res = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
    });
    
    const existingSheets = res.data.sheets?.map(s => s.properties?.title) || [];
    
    // 檢查並創建救護紀錄工作表
    if (!existingSheets.includes(GOOGLE_SHEETS_CONFIG.RESCUE_SHEET_NAME)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: GOOGLE_SHEETS_CONFIG.RESCUE_SHEET_NAME,
              },
            },
          }],
        },
      });
    }
    
    // 檢查並創建協勤時數工作表
    if (!existingSheets.includes(GOOGLE_SHEETS_CONFIG.ACTIVITY_SHEET_NAME)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: GOOGLE_SHEETS_CONFIG.ACTIVITY_SHEET_NAME,
              },
            },
          }],
        },
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('初始化 Google Sheets 失敗:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 設置自動同步任務
 */
export function setupAutoSync() {
  // 檢查是否設置了 Google Sheet ID
  if (!GOOGLE_SHEETS_CONFIG.SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('尚未設置 Google Sheets 同步所需的憑證，自動同步未啟動');
    return;
  }
  
  console.log('設置 Google Sheets 自動同步...');
  
  // 初始化 Google Sheets
  initializeGoogleSheets().then(result => {
    if (result.success) {
      console.log('Google Sheets 初始化成功');
      
      // 立即執行一次同步
      syncRescuesToSheet().then(result => {
        console.log('救護紀錄同步結果:', result);
      });
      
      syncActivitiesToSheet().then(result => {
        console.log('協勤時數同步結果:', result);
      });
      
      // 設置定期同步
      setInterval(() => {
        syncRescuesToSheet().then(result => {
          console.log('自動同步救護紀錄結果:', result);
        });
        
        syncActivitiesToSheet().then(result => {
          console.log('自動同步協勤時數結果:', result);
        });
      }, GOOGLE_SHEETS_CONFIG.SYNC_INTERVAL);
      
      console.log(`自動同步已設置，間隔時間: ${GOOGLE_SHEETS_CONFIG.SYNC_INTERVAL / (60 * 60 * 1000)} 小時`);
    } else {
      console.error('Google Sheets 初始化失敗:', result.error);
    }
  });
}
