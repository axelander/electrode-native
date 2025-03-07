import path from 'path'
import fs from 'fs'
import { fileUtils, ModuleTypes, log } from 'ern-core'
import { CodegenConfigurator, DefaultGenerator } from './index'
import {
  PKG_FILE,
  MODEL_FILE,
  FLOW_CONFIG_FILE,
  FLOW_BIN_VERSION,
} from './Constants'

export const GENERATE = [
  ['android', 'ERNAndroid'],
  ['javascript', 'ERNES6'],
  ['IOS', 'ERNSwift'],
]

export async function generateSwagger(
  { apiSchemaPath = MODEL_FILE, name, namespace = '', ...optional },
  outFolder: string
) {
  const inputSpec = path.resolve(outFolder, apiSchemaPath)
  const shared = {
    apiPackage: `${namespace}.api`,
    description: optional.apiDescription,
    groupId: namespace,
    inputSpec,
    modelPackage: `${namespace}.model`,
    projectVersion: optional.apiVersion,
    version: optional.apiVersion,
    ...optional,
  }

  for (const [projectName, lang] of GENERATE) {
    const cc = new CodegenConfigurator({
      ...shared,
      lang,
      outputDir: outFolder + '/' + projectName,
      projectName,
    })
    const opts = await cc.toClientOptInput()
    new DefaultGenerator().opts(opts).generate()
  }
}
export function generatePackageJson({
  npmScope,
  reactNativeVersion,
  apiVersion = '1.0.0',
  apiDescription,
  apiAuthor,
  apiLicense,
  bridgeVersion = '',
  packageName,
  ...conf
}: {
  npmScope?: string
  reactNativeVersion?: string
  apiVersion?: string
  apiDescription?: string
  apiAuthor?: string
  apiLicense?: string
  bridgeVersion?: string
  packageName?: string
  config?: any
}) {
  return JSON.stringify(
    {
      author: apiAuthor,
      dependencies: {
        'react-native-electrode-bridge': `${bridgeVersion.split('.')[0]}.${
          bridgeVersion.split('.')[1]
        }.x`,
      },
      description: apiDescription,
      devDependencies: {
        'flow-bin': FLOW_BIN_VERSION,
      },
      ern: {
        message: conf,
        moduleType: `${ModuleTypes.API}`,
      },
      keywords: [`${ModuleTypes.API}`],
      license: apiLicense,
      main: 'javascript/src/index.js',
      name: npmScope ? `@${npmScope}/${packageName}` : packageName,
      scripts: {
        flow: 'flow',
      },
      version: apiVersion,
    },
    null,
    2
  )
}

export async function generateInitialSchema({
  namespace,
  apiSchemaPath,
}: {
  namespace?: string
  apiSchemaPath: string
}) {
  return apiSchemaPath && fs.existsSync(apiSchemaPath)
    ? fileUtils.readFile(apiSchemaPath)
    : `
  {
    "swagger": "2.0",
    "info": {
      "description": "Walmart Item Module",
      "title": "WalmartItem",
      "contact": {
        "name": "ERN Mobile Platform Team"
      }
    },
    "paths": {
      "/items": {
        "get": {
          "tags": [
          "WalmartItem"
          ],
          "description": "Returns all items from the system that the user has access to",
          "operationId": "findItems",
          "parameters": [{
            "name": "limit",
            "in": "query",
            "description": "maximum number of results to return",
            "required": false,
            "type": "integer",
            "format": "int32"
          }],
          "responses": {
            "200": {
              "description": "Item response",
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/definitions/Item"
                }
              }
            }
          }
        },
        "post": {
          "tags": [
          "WalmartItem"
          ],
          "description": "Creates a Item in the store.",
          "operationId": "addItem",
          "parameters": [{
            "name": "item",
            "in": "body",
            "description": "Item to add",
            "required": true,
            "schema": {
              "$ref": "#/definitions/Item"
            }
          }],
          "responses": {
            "200": {
              "schema": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "event/itemAdded": {
        "event": {
          "tags": [
          "WalmartItem"
          ],
          "operationId": "itemAdded",
          "parameters": [{
            "name": "itemId",
            "in": "path",
            "description": "Event to notify new item added",
            "required": true,
            "type": "string"
          }]
        }
      }
    },
    "definitions": {
      "Item": {
        "type": "object",
        "required": [
        "name",
        "id"
        ],
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "desc": {
            "type": "string"
          }
        }
      }
    }
  }
  `
}

export function generateFlowConfig(): string {
  return `[ignore]

[include]

[libs]

[lints]

[options]
`
}

export default async function generateProject(
  config: any = {},
  outFolder: string
) {
  await fileUtils.writeFile(
    path.join(outFolder, PKG_FILE),
    generatePackageJson(config)
  )
  await fileUtils.writeFile(
    path.join(outFolder, MODEL_FILE),
    await generateInitialSchema(config)
  )
  await fileUtils.writeFile(
    path.join(outFolder, FLOW_CONFIG_FILE),
    generateFlowConfig()
  )
  await generateSwagger(config, outFolder)
}
