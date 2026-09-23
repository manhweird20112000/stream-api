export abstract class BaseUseCase<IRequest, IResponse> {
  abstract execute(input: IRequest): Promise<IResponse> | IResponse;
}
