import {z} from 'zod';
import { Request,Response,NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

export const zodErrorToApiError = (error: z.ZodError): ApiError => {
    const errorMessages = error.issues.map((err:any) => {
        const path = err.path.length > 0 ? err.path.join('.') : 'field';
        return `${path}: ${err.message}`;
    });
    return new ApiError(`validation error, ${errorMessages.join(', ')}`, 400);
}

/**
 * Parse query params with a zod schema. Express 5 makes req.query read-only,
 * so this returns the parsed values instead of replacing req.query.
 */
export const parseQuery = <T extends z.ZodTypeAny>(schema: T, query: unknown): z.infer<T> => {
    const result = schema.safeParse(query);
    if (!result.success) throw zodErrorToApiError(result.error);
    return result.data;
}

export const validate = (schema:z.ZodSchema) =>{
    return (req:Request , res:Response ,next:NextFunction)=>{
        try{
           
            const validatedData = schema.parse(req.body);
            req.body = validatedData;
            
            next();
        } catch(error){

            if(error instanceof z.ZodError){
                return next(zodErrorToApiError(error));
            }

            return next(new ApiError(`validation error occured ${error}`,500));

        }
    }
}