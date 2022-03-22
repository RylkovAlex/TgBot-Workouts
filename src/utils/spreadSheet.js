const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { create } = require('../models/workout');

const credentials = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
};

class SpreadSheet {
  static async build(user) {
    const auth = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive',
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
      throw new Error(`Error in SpreadSheet class constructor`);
    }
    this.drive = drive;
    this.spreadSheet = spreadSheet;
    // console.log(this.spreadSheet.spreadSheetId);
  }

  getId() {
    return this.spreadSheet.spreadsheetId;
  }

  async create({ userEmail, ...props }) {
    try {
      this.spreadSheet = new GoogleSpreadsheet();
      await this.spreadSheet
        .useServiceAccountAuth(credentials)
        .catch((error) => {
          throw new Error(
            `Ошибка авторизации в GoogleSpreadsheet: ${error.message}`
          );
        });
      await this.spreadSheet.createNewSpreadsheetDocument(props);
      const { spreadsheetId } = this.spreadSheet;

      const permission = {
        type: 'user',
        role: 'owner',
        emailAddress: userEmail,
        pendingOwner: true,
      };
      await this.drive.permissions.create({
        resource: permission,
        fileId: spreadsheetId,
        fields: 'id',
        transferOwnership: true,
      });

      return spreadsheetId;
    } catch (error) {
      console.log(error);
      throw new Error(`Couldn't create google spreadSheet!`);
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
    const newSheet = await this.spreadSheet.addSheet(props);
    await this.spreadSheet._makeBatchUpdateRequest([
      {
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: newSheet.sheetId,
            },
            description:
              'Редактируя данные на этом листе, Вы рискуете нарушить работоспособность бота',
            warningOnly: true,
          },
        },
      },
    ]);
    return newSheet;
  }
}

module.exports = SpreadSheet;
