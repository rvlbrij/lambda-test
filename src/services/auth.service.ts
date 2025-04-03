import { injectable } from 'inversify';
import { CognitoUserAttribute, CognitoUserPool } from 'amazon-cognito-identity-js';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import environment from '../environment';

export interface LoginSuccessResponse {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

export interface IAuthService {
  signUp(email: string, password: string, referralCode?: string): Promise<any>;
  login(email: string, password: string): Promise<LoginSuccessResponse>;
}

@injectable()
export class AuthService implements IAuthService {
  private userPoolId: string = environment.userPoolId;
  private userPoolClientId: string = environment.userPoolClientId;
  private userPool: CognitoUserPool;
  private cognitoIdentityServiceProvider: CognitoIdentityServiceProvider;

  constructor() {
    this.userPool = new CognitoUserPool({
      UserPoolId: this.userPoolId,
      ClientId: this.userPoolClientId,
    });
    this.cognitoIdentityServiceProvider = new CognitoIdentityServiceProvider({
      region: environment.awsRegion,
    });
  }

  async login(email: string, password: string): Promise<LoginSuccessResponse> {
    const params = {
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      UserPoolId: this.userPoolId,
      ClientId: this.userPoolClientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    const authResponse = await this.cognitoIdentityServiceProvider
      .adminInitiateAuth(params)
      .promise();

    const session = authResponse.AuthenticationResult;

    if (!session) {
      throw new Error('Authentication failed: No session returned');
    }

    return {
      idToken: session.IdToken || '',
      accessToken: session.AccessToken || '',
      refreshToken: session.RefreshToken || '',
    };
  }

  async signUp(email: string, password: string, referralCode: string): Promise<any> {
    const attributeList: CognitoUserAttribute[] = [];
    if (referralCode) {
      if (!this.isValidReferralCode(referralCode)) {
        throw new Error('Invalid referral code format');
      }

      attributeList.push(
        new CognitoUserAttribute({
          Name: 'custom:referralCode',
          Value: referralCode,
        })
      );
    }

    try {
      const signUpResponse = await new Promise((resolve, reject) => {
        this.userPool.signUp(email, password, attributeList, [], (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      if (referralCode) {
        await this.validateAndProcessReferralCode(referralCode, email);
      }

      return signUpResponse;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  private isValidreferralCode(code: string): boolean {
    return /^[a-zA-Z0-9]{8,12}.test(code);
  }

  private async validateAndProcessReferralCode(referralCode: string, newUserEmail: string): Promise<void> {
    try {

      const referrerUser = await this.findUserByReferralCode(referralCode);
      
      if (!referrerUser) {
        throw new Error('Referral code not found');
      }

      await this.recordReferral(referrerUser, newUserEmail);

    } catch (error) {
      console.error('Referral processing error:', error);
      throw new Error('Failed to process referral');
    }
  }

  private async findUserByReferralCode(referralCode: string): Promise<any> {
    return null;
  }

  private async recordReferral(referrerUser: any, newUserEmail: string): Promise<void> {
  }
}