const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { create } = require('../models/workout');
const getDate = require('./getDate');

const credentials = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
};

const DATE_HEADER = 'Дата';
const TIME_HEADER = 'Длительность, мин.';

class SpreadSheet {
  static async build(user) {
    const auth = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        // TODO: use googleapis instead of GoogleSpreadsheet
        // 'https://www.googleapis.com/auth/spreadsheets'
      ],
    });
    const drive = google.drive({ version: 'v3', auth });
    const spreadSheet = user?.spreadSheetId
      ? new GoogleSpreadsheet(user.spreadSheetId)
      : new GoogleSpreadsheet();
    await spreadSheet.useServiceAccountAuth(credentials).catch((error) => {
      throw new Error(
        `Ошибка авторизации в GoogleSpreadsheet: ${error.message}`
      );
    });

    return new SpreadSheet(spreadSheet, drive);
  }

  constructor(spreadSheet, drive) {
    if (!(spreadSheet instanceof GoogleSpreadsheet)) {
      throw new Error(
        `Error in SpreadSheet constructor: class should be instance of GoogleSpreadsheet`
      );
    }
    this.drive = drive;
    this.spreadSheet = spreadSheet;
    // console.log(this.spreadSheet.spreadSheetId);
  }

  getId() {
    return this.spreadSheet.spreadsheetId;
  }

  async create(user) {
    try {
      this.spreadSheet = new GoogleSpreadsheet();
      await this.spreadSheet
        .useServiceAccountAuth(credentials)
        .catch((error) => {
          error.message = `Авторизация в GoogleSpreadsheet: ${error.message}`;
          throw error;
        });
      await this.spreadSheet
        .createNewSpreadsheetDocument({
          title: `My Workouts`,
        })
        .catch((error) => {
          error.message = `Новая таблица: ${error.message}`;
          throw error;
        });

      const { spreadsheetId } = this.spreadSheet;

      await this.drive.permissions
        .create({
          fileId: spreadsheetId,
          // transferOwnership: true,
          resource: {
            role: 'reader',
            type: 'user',
            emailAddress: user.email,
          },
        })
        .catch((error) => {
          error.message = `Передача прав владения документом: ${error.message}`;
          throw error;
        });

      await user.populate('workouts').execPopulate();
      const { workouts } = user;
      if (workouts.length > 0) {
        await Promise.all(
          workouts.map(async (workout) => {
            await this.updateWorkoutSheet(workout);
          })
        );
      }

      return spreadsheetId;
    } catch (error) {
      error.message = `Создание таблицы: ${error.message}`;
      throw error;
    }
  }

  async getSheet(title) {
    await this.spreadSheet.loadInfo();
    return this.spreadSheet.sheetsByTitle[title];
  }

  async deleteSheet(title) {
    await this.spreadSheet.loadInfo();
    await this.spreadSheet.sheetsByTitle[title].del();
  }

  async addSheet(props) {
    try {
      const newSheet = await this.spreadSheet.addSheet(props);
      await this.spreadSheet._makeBatchUpdateRequest([
        {
          addProtectedRange: {
            protectedRange: {
              range: {
                sheetId: newSheet.sheetId,
              },
              description:
                'Внимание! Редактируя данные на этом листе, Вы рискуете нарушить работоспособность бота!',
              warningOnly: true,
            },
          },
        },
      ]);
      return newSheet;
    } catch (error) {
      error.message = `Создание нового листа в таблице: ${error.message}`;
      throw error;
    }
  }

  async autoResize(sheetId, startIndex = 0, endIndex) {
    await this.spreadSheet
      ._makeBatchUpdateRequest([
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex,
              endIndex,
            },
          },
        },
      ])
      .catch((error) => {
        error.message = `Ресайз таблицы: ${error.message}`;
        throw error;
      });
  }

  async deleteColumn() {
    await this.spreadSheet
      ._makeBatchUpdateRequest([
        {
          deleteDimension: {
            range: {
              sheetId: this.spreadSheet.spreadsheetId,
              dimension: 'COLUMNS',
              startIndex: 1,
              endIndex: 1,
            },
          },
        },
      ])
      .catch((error) => {
        error.message = `Удаление колонки в таблице: ${error.message}`;
        throw error;
      });
  }

  async addSession(session) {
    try {
      await session.populate('workout').execPopulate();
      const { time } = session.workout.params;
      const paramNames = session.workout.getParamNames();
      const data = await session.getData();

      const rowValues = [getDate(data.createdAt)];
      if (time) {
        rowValues.push(data.time);
      }
      paramNames.forEach((paramName) => rowValues.push(data[paramName]));

      const workoutSheet = await this.getSheet(session.workout.name);
      await workoutSheet.addRow(rowValues);
      this.autoResize(workoutSheet.sheetId, 0, rowValues.length + 1);
    } catch (error) {
      error.message = `Вставка данных в таблицу: ${error.message}`;
      throw error;
    }
  }

  async updateWorkoutSheet(workout) {
    try {
      const workoutSheet =
        (await this.getSheet(workout.name).then(async (sheet) => {
          if (sheet) {
            await sheet.clear();
          }
          return sheet;
        })) ||
        (await this.addSheet({
          title: workout.name,
        }));
      const headerValues = [DATE_HEADER];
      const isTime = workout.params.time;
      if (isTime) {
        headerValues.push(TIME_HEADER);
      }
      const paramNames = workout.getParamNames();
      headerValues.push(...paramNames);
      await workoutSheet.setHeaderRow(headerValues);

      if (!workout.populated('sessions')) {
        await workout.populate('sessions').execPopulate();
      }
      const rows = await workout.sessions.reduce(async (result, session) => {
        const rowValues = [];
        const data = await session.getData();
        rowValues.push(getDate(data.createdAt));
        if (isTime) {
          rowValues.push(data.time);
        }
        paramNames.forEach((name) => rowValues.push(data[name]));
        return await result.then((r) => {
          r.push(rowValues);
          return r;
        });
      }, Promise.resolve([]));

      await workoutSheet.addRows(rows);
      this.autoResize(workoutSheet.sheetId, 0, headerValues.length + 1);
    } catch (error) {
      error.message = `Обновление листа: ${error.message}`;
      throw error;
    }
  }
}

module.exports = SpreadSheet;
