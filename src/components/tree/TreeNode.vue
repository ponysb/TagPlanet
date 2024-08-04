<template>
  <li v-if="node.type === 'file'">
    <div @click="handleClick(node)" :class="{ selected: isSelected, 'has-children': hasChildren }">
      <span class="icon">📂</span>
      <span class="node-title">{{ node.title }} ({{ node.children.length }})</span>
      <span v-if="hasChildren" class="toggle-icon" @click.stop="toggleOpen">
        {{ isOpen ? '⬇️' : '➡️' }}
      </span>
    </div>
    <ul v-if="isOpen && hasChildren">
      <TreeNode 
          v-for="child in node.children" 
          :key="child.key" 
          :node="child" 
          :is-selected="selectedNode === child.key" 
          :selected-node="selectedNode"
          @node-clicked="handleNodeClick"
      />
    </ul>
  </li>
</template>

<script setup>
import { ref, computed } from 'vue';
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  node: Object,
  isSelected: Boolean,
  selectedNode: null
});

const emit = defineEmits(['node-clicked']);

const isOpen = ref(true);
const hasChildren = computed(() => Array.isArray(props.node.children) && props.node.children.length > 0);

function handleClick() {
  emit('node-clicked', props.node);
}

function handleNodeClick(node) {
  // This will ensure the event is passed up the chain
  emit('node-clicked', node);
}

function toggleOpen(event) {
  isOpen.value = !isOpen.value;
  event.stopPropagation();
}
</script>


<style scoped>
.node-title{
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  word-wrap: normal;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
li {
  list-style-type: none;
  margin-top: 8px;
}

div {
  cursor: pointer;
  padding: 8px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  position: relative;
}

.icon {
  margin-right: 5px;
  margin-top: -5px;
}

.toggle-icon {
  margin-left: auto;
  cursor: pointer;
  font-size: 14px;
}

.selected {
  background-color: #e9e9e9;
}

ul {
  padding-left: 20px;
}
</style>
