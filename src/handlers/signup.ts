import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { SignupDto } from '../dtos';
import { container } from '../inversify.config';
import { IAuthService } from '../services';
import { TYPES } from '../types';

export class SignupDto {
  email: string;
  password: string;
  referralCode?: string;
}

export const signupHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const authService = container.get<IAuthService>(TYPES.AuthService);

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is empty' }),
      };
    }

    const signupRequest = plainToClass(SignupDto, JSON.parse(event.body));
    const validationErrors = await validate(signupRequest);

    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Validation failed',
          errors: validationErrors,
        }),
      };
    }

    await authService.signUp(
      signupRequest.email,
      signupRequest.password,
      signupRequest.referralcode
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'User registration successful',
        ...(signupRequest.referralCode && { referralApplied: true })
      }),
    };
  } catch (err) {
    console.error(err);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (err instanceof Error) {
      if (err.message.includes('Invalid referral code')) {
        statusCode = 400;
        errorMessage = err.message;
      } else if (err.message.includes('Referral code not found')) {
        statusCode = 404;
        errorMessage = err.message;
      } else if (err.message.includes('User already exists')) {
        statusCode = 409;
        errorMessage = 'Email already in use';
      }
    }

    return {
      statusCode,
      body: JSON.stringify({ 
        message: errorMessage,
        ...(statusCode !== 500 && { details: err.message }) 
      }),
    };
  }
};