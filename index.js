import Fastify from "fastify"
import path from "node:path/posix"
import colors from "colors"
import { readdirSync } from "node:fs"
import { select } from "@inquirer/prompts"
import { getFile, changeExposedState, isExposed } from "./utils.js"

const fastify = Fastify({
  logger: false
})

fastify.get("/", (request, reply) => {
  const query = request.query
  if (!Object.keys(query).includes("path")) return reply.send({})
  reply.header("Content-Disposition", `attachment; filename="${query.path.split("/").pop()}"`)
  reply.send(getFile(query.path))
})

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})

const theme = {
  prefix: "",
  style: {
    highlight: x => x
  },
  helpMode: "never"
}

const basePath = path.join("/Projects")
let currentPath = basePath
let lastSelectedFileIndex

while (true) {
  console.clear()
  const items = readdirSync(currentPath, { withFileTypes: true })
  const files = items.filter(x => x.isFile()).map(x => ({ name: isExposed(path.join(currentPath, x.name)) ? x.name.green : x.name, value: x }))
  const directories = items.filter(x => x.isDirectory()).map(x => ({ name: `${x.name}/`.yellow, value: x }))
  let selectChoices = [...directories, ...files]
  if (currentPath != basePath) selectChoices = [{ name: "...".red, value: "" }, ...selectChoices]
  const selectedItem = await select({
    message: path.join(currentPath) + "/",
    choices: selectChoices,
    default: selectChoices[lastSelectedFileIndex]?.value,
    theme: theme,
    loop: false
  })
  if (selectedItem == "") {
    lastSelectedFileIndex = undefined
    currentPath = currentPath.slice(0, currentPath.lastIndexOf("/"))
  } else if (selectedItem.isFile()) {
    lastSelectedFileIndex = selectChoices.findIndex(x => x.value == selectedItem)
    changeExposedState(path.join(currentPath, selectedItem.name))
  } else if (selectedItem.isDirectory()) {
    lastSelectedFileIndex = undefined
    currentPath = path.join(currentPath, selectedItem.name)
  }
}
