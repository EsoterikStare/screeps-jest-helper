import * as util from "util";
import jestMock from "jest-mock";


/**
 * Generic type for partial implementations of interfaces.
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>> :
                   T[P] extends Id<infer V> ? Id<V> :
                   T[P] extends (object | undefined) ? DeepPartial<T[P]> :
                   T[P];
} & { [key: string]: any };

/**
 * Conditional type for all concrete implementations of Structure.
 * Unlike Structure<T>, ConcreteStructure<T> gives you the actual concrete class that extends Structure<T>.
 */
type ConcreteStructure<T extends StructureConstant> =
  T extends STRUCTURE_EXTENSION ? StructureExtension
  : T extends STRUCTURE_RAMPART ? StructureRampart
  : T extends STRUCTURE_ROAD ? StructureRoad
  : T extends STRUCTURE_SPAWN ? StructureSpawn
  : T extends STRUCTURE_LINK ? StructureLink
  : T extends STRUCTURE_WALL ? StructureWall
  : T extends STRUCTURE_STORAGE ? StructureStorage
  : T extends STRUCTURE_TOWER ? StructureTower
  : T extends STRUCTURE_OBSERVER ? StructureObserver
  : T extends STRUCTURE_POWER_SPAWN ? StructurePowerSpawn
  : T extends STRUCTURE_EXTRACTOR ? StructureExtractor
  : T extends STRUCTURE_LAB ? StructureLab
  : T extends STRUCTURE_TERMINAL ? StructureTerminal
  : T extends STRUCTURE_CONTAINER ? StructureContainer
  : T extends STRUCTURE_NUKER ? StructureNuker
  : T extends STRUCTURE_FACTORY ? StructureFactory
  : T extends STRUCTURE_KEEPER_LAIR ? StructureKeeperLair
  : T extends STRUCTURE_CONTROLLER ? StructureController
  : T extends STRUCTURE_POWER_BANK ? StructurePowerBank
  : T extends STRUCTURE_PORTAL ? StructurePortal
  : T extends STRUCTURE_INVADER_CORE ? StructureInvaderCore
  : never;

/**
 * Properties I've seen having been accessed internally by Jest's matchers and message formatters (there may be others).
 */
const jestInternalStuff: Array<symbol | string | number> = [
  Symbol.iterator,
  Symbol.toStringTag,
  "asymmetricMatch",
  "$$typeof",
  "nodeType",
  "@@__IMMUTABLE_ITERABLE__@@",
  "@@__IMMUTABLE_RECORD__@@",
  "_isMockFunction",
  "mockClear",
];

/**
 * Mocks a global object instance, like Game or Memory.
 *
 * @param name - the name of the global
 * @param mockedProps - the properties you need to mock for your test
 * @param allowUndefinedAccess - if false, accessing a property not present in mockProps, will throw an exception
 */
function mockGlobal<T extends object>(name: string, mockedProps: DeepPartial<T> = {}, allowUndefinedAccess: boolean = false) {
  const g = global as any;
  const finalMockedProps = {...mockedProps, mockClear: () => {}};
  g[name] = createMock<T>(finalMockedProps, allowUndefinedAccess, name);
}

/**
 * Creates a mock instance of a class/interface.
 *
 * @param mockedProps - the properties you need to mock for your test
 * @param allowUndefinedAccess - if false, accessing a property not present in mockProps, will throw an exception
 */
function mockInstanceOf<T extends object>(mockedProps: DeepPartial<T> = {}, allowUndefinedAccess: boolean = false): T {
  return createMock(mockedProps, allowUndefinedAccess, '');
}

function createMock<T extends object>(mockedProps: DeepPartial<T>, allowUndefinedAccess: boolean, path: string): T {
  const target: DeepPartial<T> = {};

  Object.entries(mockedProps).forEach(([propName, mockedValue]) => {
    target[propName as keyof T] =
      typeof mockedValue === 'function' ? jestMock.fn(mockedValue)
        : Array.isArray(mockedValue) ? mockedValue.map((element, index) => createMock(element, allowUndefinedAccess, concatenatePath(path, `${propName}[${index}]`)))
        : typeof mockedValue === 'object' && shouldMockObject(mockedValue) ? createMock(mockedValue, allowUndefinedAccess, concatenatePath(path, propName))
        : mockedValue;
  });
  return new Proxy<T>(target as T, {
    get(t: T, p: PropertyKey): any {
      if (p in target) {
        return target[p.toString()];
      } else if (!allowUndefinedAccess && !jestInternalStuff.includes(p)) {
        throw new Error(
          `Unexpected access to unmocked property "${concatenatePath(path, p.toString())}".\n` +
          'Did you forget to mock it?\n' +
          'If you intended for it to be undefined, you can explicitly set it to undefined (recommended) or set "allowUndefinedAccess" argument to true.'
        );
      } else {
        return undefined;
      }
    }
  });
}

function shouldMockObject(value: object) {
  return (
      value !== null
      && Object.getPrototypeOf(value) === Object.prototype
      && !util.types.isProxy(value)
  );
}

function concatenatePath(parentPath: string, propName: string) {
  return parentPath ? `${parentPath}.${propName}` : propName;
}

/**
 * Keeps counters for each structure type, to generate unique IDs for them.
 */
const structureCounters: { [key: string]: number } = {};

/**
 * Creates a mock instance of a structure, with a unique ID, structure type and toJSON.
 * The unique IDs allow Jest's matcher (deep equality) to tell them apart.
 *
 * @param structureType
 * @param mockedProps - the additional properties you need to mock for your test
 */
function mockStructure<T extends StructureConstant>(structureType: T, mockedProps: DeepPartial<ConcreteStructure<T>> = {}): ConcreteStructure<T> {
  const count = (structureCounters[structureType] ?? 0) + 1;

  structureCounters[structureType] = count;
  return mockInstanceOf<ConcreteStructure<T>>({
    id: `${structureType}${count}` as Id<ConcreteStructure<T>>,
    structureType: structureType as any,
    toJSON() {
      return {
        id: this.id,
        structureType: this.structureType
      };
    },
    ...mockedProps
  });
}

/**
 * Call this once before running tests that create new instances of RoomPosition.
 */
function mockRoomPositionConstructor(globalObject: any) {
  globalObject.RoomPosition = jestMock.fn(mockRoomPosition);
}

/**
 * Creates a mock instance of RoomPosition.
 */
function mockRoomPosition(x: number, y: number, roomName: string): RoomPosition {
  return mockInstanceOf<RoomPosition>({
    x,
    y,
    roomName,
    toJSON: () => ({ x, y, roomName })
  });
}


export {
  mockGlobal,
  mockRoomPositionConstructor,
  mockInstanceOf,
  mockStructure
};
