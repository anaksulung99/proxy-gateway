import { addCollection, addIcon, Icon, type IconifyJSON } from '@iconify/vue/offline'
import lucideIcons from '@iconify-json/lucide/icons.json'
import hugeiconsIcons from '@iconify-json/hugeicons/icons.json'
import materialSymbolsIcons from '@iconify-json/material-symbols/icons.json'
import materialSymbolsLightIcons from '@iconify-json/material-symbols-light/icons.json'
import radixIcons from '@iconify-json/radix-icons/icons.json'
import mdiIcons from '@iconify-json/mdi/icons.json'

let registered = false

function registerCollections() {
  if (registered) {
    return
  }

  addCollection(lucideIcons as IconifyJSON)
  addCollection(hugeiconsIcons as IconifyJSON)
  addCollection(materialSymbolsIcons as IconifyJSON)
  addCollection(materialSymbolsLightIcons as IconifyJSON)
  addCollection(radixIcons as IconifyJSON)
  addCollection(mdiIcons as IconifyJSON)
  registered = true
}

registerCollections()

export { addCollection, addIcon, Icon }
export default Icon
