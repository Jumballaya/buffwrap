type FixArr<T> = T extends readonly any[]
  ? Omit<T, Exclude<keyof any[], number>>
  : T;

type DropInitDot<T> = T extends `.${infer U}` ? U : T;

type _DeepKeys<T> = T extends object
  ? {
      [K in (string | number) & keyof T]: `${
        | `.${K}`
        | (`${K}` extends `${number}` ? `[${K}]` : never)}${
        | ""
        | _DeepKeys<FixArr<T[K]>>}`;
    }[(string | number) & keyof T]
  : never;

type DeepKeys<T> = DropInitDot<_DeepKeys<FixArr<T>>>;

type Vec2 = [number, number];
type Vec3 = [...Vec2, number];
type Vec4 = [...Vec3, number];
type Mat2 = [...Vec2, ...Vec2];
type Mat3 = [...Vec3, ...Vec3, ...Vec3];
type Mat4 = [...Vec4, ...Vec4, ...Vec4, ...Vec4];

type VertexStruct = {
  position: [number, number, number];
  texCoord: [number, number];
  normal: [number, number, number];
  apples: number[];
  attributes: {
    model_matrix: Mat4;
    camera: {
      view_matrix: Mat4;
      foo: {
        bar: {
          baz: {
            banana: number;
          };
        };
      };
    };
  };
};

type keys = DeepKeys<VertexStruct>;

const struct: VertexStruct = {
  position: [1, 2, 3],
  texCoord: [0, 1],
  normal: [0, 0, 1],
  apples: [1],
  attributes: {
    model_matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    camera: {
      view_matrix: [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      foo: {
        bar: {
          baz: {
            banana: 10,
          },
        },
      },
    },
  },
};
function get_value(key: keys) {
  const keys = key.split(".");
  let val: number | number[] = 0;
  if (keys.length < 1) {
    return undefined;
  }
  let tmp;
  for (const k of keys) {
    if (tmp === undefined) {
      tmp = (struct as any)[k];
    } else {
      tmp = tmp[k];
    }
  }
  return tmp;
}

console.log(get_value("attributes.camera.foo.bar.baz.banana"));
